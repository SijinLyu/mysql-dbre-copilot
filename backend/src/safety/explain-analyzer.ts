import { Pool } from 'mysql2/promise';
import { ExplainAnalysis, ExplainRow } from './types.js';
import { logger } from '../utils/logger.js';

export class ExplainAnalyzer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async analyze(sql: string): Promise<ExplainAnalysis | null> {
    // Only EXPLAIN SELECT queries
    if (!/^\s*(SELECT|WITH)/i.test(sql)) {
      return null;
    }

    try {
      const [rows] = await this.pool.query(`EXPLAIN ${sql}`);
      const explainRows = (rows as any[]).map(row => ({
        id: row.id,
        select_type: row.select_type,
        table: row.table || '',
        type: row.type || '',
        possible_keys: row.possible_keys,
        key: row.key,
        key_len: row.key_len,
        ref: row.ref,
        rows: row.rows || 0,
        filtered: row.filtered || 0,
        Extra: row.Extra || '',
      })) as ExplainRow[];

      return this.analyzeExplainOutput(explainRows);
    } catch (error) {
      logger.warn('EXPLAIN failed', { error: (error as Error).message, sql });
      return null;
    }
  }

  private analyzeExplainOutput(rows: ExplainRow[]): ExplainAnalysis {
    const warnings: string[] = [];

    const hasFullTableScan = rows.some(r => r.type === 'ALL');
    const hasFilesort = rows.some(r => r.Extra?.includes('Using filesort'));
    const hasTempTable = rows.some(r => r.Extra?.includes('Using temporary'));
    const estimatedRows = rows.reduce((sum, r) => sum + (r.rows || 0), 0);

    if (hasFullTableScan) {
      const scanTables = rows.filter(r => r.type === 'ALL').map(r => r.table);
      warnings.push(`Full table scan on: ${scanTables.join(', ')}. Consider adding an index.`);
    }

    if (hasFilesort) {
      warnings.push('Query uses filesort. Consider adding an index on ORDER BY columns.');
    }

    if (hasTempTable) {
      warnings.push('Query uses temporary table. Consider optimizing GROUP BY or DISTINCT.');
    }

    if (estimatedRows > 100000) {
      warnings.push(`High estimated row scan: ~${estimatedRows.toLocaleString()} rows.`);
    }

    // Check for no-index access on large tables
    for (const row of rows) {
      if (row.type === 'ALL' && row.rows > 10000) {
        warnings.push(
          `Table '${row.table}' scanned without index (~${row.rows.toLocaleString()} rows). ` +
          `Possible keys: ${row.possible_keys || 'none'}.`
        );
      }
    }

    return {
      rows,
      hasFullTableScan,
      hasFilesort,
      hasTempTable,
      estimatedRows,
      warnings,
    };
  }
}
