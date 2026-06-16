import { ExplainAnalysis, ExplainRow } from '../safety/types.js';

export interface PlanIssue {
  severity: 'info' | 'warning' | 'critical';
  category: 'index' | 'sort' | 'join' | 'scan' | 'temp' | 'estimation';
  message: string;
  affectedTable: string;
  hint?: string;
}

export interface PlanScore {
  overall: number;
  indexUsage: number;
  sortEfficiency: number;
  joinQuality: number;
  scanEfficiency: number;
}

/**
 * Deep diagnostics on top of a basic ExplainAnalysis.
 * Produces issue lists, severity scores, and per-table breakdowns.
 */
export class QueryPlanDiagnostics {
  diagnose(analysis: ExplainAnalysis): {
    issues: PlanIssue[];
    score: PlanScore;
    summary: string;
  } {
    const issues: PlanIssue[] = [];

    for (const row of analysis.rows) {
      issues.push(...this.checkRowAccess(row));
      issues.push(...this.checkRowExtras(row));
      issues.push(...this.checkRowEstimation(row));
    }

    const score = this.computeScore(analysis, issues);
    const summary = this.buildSummary(analysis, issues, score);

    return { issues, score, summary };
  }

  private checkRowAccess(row: ExplainRow): PlanIssue[] {
    const issues: PlanIssue[] = [];

    // Access type analysis
    const accessQuality: Record<string, { score: number; description: string }> = {
      'system': { score: 100, description: 'Single-row constant table' },
      'const': { score: 100, description: 'Single-row primary or unique key lookup' },
      'eq_ref': { score: 95, description: 'One row per join match (best for joins)' },
      'ref': { score: 85, description: 'Index lookup, multiple matches' },
      'fulltext': { score: 75, description: 'Full-text index search' },
      'ref_or_null': { score: 75, description: 'Reference with NULL handling' },
      'index_merge': { score: 60, description: 'Multiple indexes merged' },
      'unique_subquery': { score: 75, description: 'Unique-key subquery' },
      'index_subquery': { score: 65, description: 'Index subquery' },
      'range': { score: 70, description: 'Range scan on indexed column' },
      'index': { score: 50, description: 'Full index scan (every index entry read)' },
      'ALL': { score: 10, description: 'Full table scan' },
    };

    const quality = accessQuality[row.type];
    if (quality && quality.score < 50) {
      issues.push({
        severity: row.type === 'ALL' ? 'critical' : 'warning',
        category: 'scan',
        message: `Table '${row.table}' uses access type '${row.type}' — ${quality.description}.`,
        affectedTable: row.table,
        hint: row.possible_keys
          ? `MySQL noted possible keys: ${row.possible_keys}. Check why none was used.`
          : 'No usable index exists. Consider adding an appropriate index.',
      });
    }

    if (row.type === 'ALL' && row.rows > 1000) {
      issues.push({
        severity: 'critical',
        category: 'index',
        message: `Full table scan on '${row.table}' will examine ~${row.rows.toLocaleString()} rows.`,
        affectedTable: row.table,
        hint: 'Adding a covering index on the WHERE clause columns will dramatically improve this query.',
      });
    }

    return issues;
  }

  private checkRowExtras(row: ExplainRow): PlanIssue[] {
    const issues: PlanIssue[] = [];
    const extras = row.Extra || '';

    if (extras.includes('Using filesort')) {
      issues.push({
        severity: 'warning',
        category: 'sort',
        message: `Filesort detected on '${row.table}'. MySQL must sort the result set externally.`,
        affectedTable: row.table,
        hint: 'Add an index on the ORDER BY columns to allow MySQL to read pre-sorted rows.',
      });
    }

    if (extras.includes('Using temporary')) {
      issues.push({
        severity: 'warning',
        category: 'temp',
        message: `Temporary table created for '${row.table}'.`,
        affectedTable: row.table,
        hint: 'GROUP BY and DISTINCT often cause this. Consider adding indexes on the grouping columns.',
      });
    }

    if (extras.includes('Using join buffer')) {
      issues.push({
        severity: 'warning',
        category: 'join',
        message: `Join buffer used for '${row.table}'. This is a Block Nested Loop join (slow).`,
        affectedTable: row.table,
        hint: 'Add an index on the JOIN column to enable index-based join.',
      });
    }

    if (extras.includes('Using index condition')) {
      issues.push({
        severity: 'info',
        category: 'index',
        message: `Index condition pushdown used on '${row.table}'.`,
        affectedTable: row.table,
        hint: 'This is generally good — MySQL is using the index to filter rows.',
      });
    }

    if (extras.includes('Using where; Using index')) {
      issues.push({
        severity: 'info',
        category: 'index',
        message: `Covering index used on '${row.table}' — query satisfied entirely from the index.`,
        affectedTable: row.table,
      });
    }

    return issues;
  }

  private checkRowEstimation(row: ExplainRow): PlanIssue[] {
    const issues: PlanIssue[] = [];

    if (row.rows > 1_000_000) {
      issues.push({
        severity: 'critical',
        category: 'estimation',
        message: `Estimated ${row.rows.toLocaleString()} rows for '${row.table}'. This query may be very expensive.`,
        affectedTable: row.table,
        hint: 'Add WHERE conditions on indexed columns to drastically reduce row estimates.',
      });
    } else if (row.rows > 100_000) {
      issues.push({
        severity: 'warning',
        category: 'estimation',
        message: `Estimated ${row.rows.toLocaleString()} rows for '${row.table}'.`,
        affectedTable: row.table,
        hint: 'Consider tighter filtering or pagination.',
      });
    }

    if (row.filtered !== undefined && row.filtered < 10 && row.rows > 1000) {
      issues.push({
        severity: 'warning',
        category: 'estimation',
        message: `Low selectivity for '${row.table}' (${row.filtered}% filtered).`,
        affectedTable: row.table,
        hint: 'Most rows are scanned but few survive filters. An index on the filter columns would help.',
      });
    }

    return issues;
  }

  private computeScore(analysis: ExplainAnalysis, issues: PlanIssue[]): PlanScore {
    let indexUsage = 100;
    let sortEfficiency = 100;
    let joinQuality = 100;
    let scanEfficiency = 100;

    for (const issue of issues) {
      const penalty = issue.severity === 'critical' ? 30 : issue.severity === 'warning' ? 15 : 0;
      switch (issue.category) {
        case 'index': case 'scan':
          scanEfficiency -= penalty;
          indexUsage -= penalty;
          break;
        case 'sort':
          sortEfficiency -= penalty;
          break;
        case 'join':
          joinQuality -= penalty;
          break;
      }
    }

    indexUsage = Math.max(0, indexUsage);
    sortEfficiency = Math.max(0, sortEfficiency);
    joinQuality = Math.max(0, joinQuality);
    scanEfficiency = Math.max(0, scanEfficiency);

    const overall = Math.round((indexUsage + sortEfficiency + joinQuality + scanEfficiency) / 4);

    return { overall, indexUsage, sortEfficiency, joinQuality, scanEfficiency };
  }

  private buildSummary(analysis: ExplainAnalysis, issues: PlanIssue[], score: PlanScore): string {
    if (issues.length === 0) {
      return `Query plan looks healthy (score: ${score.overall}/100). All tables use efficient access paths.`;
    }

    const critical = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

    let summary = `Query plan analysis (score: ${score.overall}/100):`;
    if (critical > 0) summary += ` ${critical} critical issue${critical > 1 ? 's' : ''}`;
    if (warnings > 0) summary += `${critical > 0 ? ',' : ''} ${warnings} warning${warnings > 1 ? 's' : ''}`;
    summary += `. Examining ~${analysis.estimatedRows.toLocaleString()} rows total.`;

    return summary;
  }
}
