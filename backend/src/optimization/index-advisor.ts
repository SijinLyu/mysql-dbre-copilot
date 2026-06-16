import { ExplainAnalysis } from '../safety/types.js';

export interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  createStatement: string;
}

export class IndexAdvisor {
  analyze(sql: string, explainAnalysis: ExplainAnalysis | undefined): IndexSuggestion[] {
    if (!explainAnalysis) return [];

    const suggestions: IndexSuggestion[] = [];

    for (const row of explainAnalysis.rows) {
      // Suggest index when full table scan with possible keys
      if (row.type === 'ALL' && row.rows > 1000) {
        const columns = this.extractFilterColumns(sql, row.table);
        if (columns.length > 0) {
          const indexName = `idx_${row.table}_${columns.join('_')}`;
          suggestions.push({
            table: row.table,
            columns,
            reason: `Full table scan on '${row.table}' (~${row.rows} rows). Adding an index could avoid scanning all rows.`,
            createStatement: `CREATE INDEX ${indexName} ON ${row.table}(${columns.join(', ')});`,
          });
        }
      }

      // Suggest covering index for filesort
      if (row.Extra?.includes('Using filesort')) {
        const orderColumns = this.extractOrderByColumns(sql, row.table);
        if (orderColumns.length > 0) {
          const indexName = `idx_${row.table}_sort_${orderColumns.join('_')}`;
          suggestions.push({
            table: row.table,
            columns: orderColumns,
            reason: `Filesort detected on '${row.table}'. An index on ORDER BY columns could eliminate the sort.`,
            createStatement: `CREATE INDEX ${indexName} ON ${row.table}(${orderColumns.join(', ')});`,
          });
        }
      }
    }

    return suggestions;
  }

  private extractFilterColumns(sql: string, table: string): string[] {
    const columns: string[] = [];

    // Match WHERE clause column references
    const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(?:GROUP|ORDER|LIMIT|HAVING|$)/i);
    if (!whereMatch) return columns;

    const whereClause = whereMatch[1];

    // Extract column = value patterns
    const colPatterns = whereClause.matchAll(/(?:(\w+)\.)?(\w+)\s*(?:=|>|<|>=|<=|LIKE|IN|BETWEEN)/gi);
    for (const match of colPatterns) {
      const tablePrefix = match[1];
      const col = match[2];
      if (!tablePrefix || tablePrefix.toLowerCase() === table.toLowerCase()) {
        if (!columns.includes(col) && !['AND', 'OR', 'NOT'].includes(col.toUpperCase())) {
          columns.push(col);
        }
      }
    }

    return columns.slice(0, 3); // Max 3 columns for composite index
  }

  private extractOrderByColumns(sql: string, table: string): string[] {
    const columns: string[] = [];
    const orderMatch = sql.match(/ORDER\s+BY\s+([\s\S]*?)(?:LIMIT|$)/i);
    if (!orderMatch) return columns;

    const parts = orderMatch[1].split(',');
    for (const part of parts) {
      const col = part.trim().replace(/\s+(ASC|DESC)/i, '').replace(/^\w+\./, '');
      if (col && !columns.includes(col)) {
        columns.push(col);
      }
    }

    return columns.slice(0, 3);
  }
}
