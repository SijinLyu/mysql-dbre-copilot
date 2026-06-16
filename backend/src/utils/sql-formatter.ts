/**
 * Lightweight SQL formatter for display purposes.
 *
 * Goals:
 * - Handle the common SELECT/INSERT/UPDATE/DELETE statements we generate.
 * - Keep output readable without being overly opinionated.
 * - Avoid third-party formatter dependencies for portability.
 */
const MAJOR_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
  'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'DROP INDEX',
  'WITH',
];

const JOIN_KEYWORDS = [
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'OUTER JOIN',
  'CROSS JOIN', 'JOIN', 'ON',
];

const INLINE_KEYWORDS = [
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC',
];

export class SqlFormatter {
  format(sql: string, options: { indent?: number; uppercase?: boolean } = {}): string {
    const indent = options.indent ?? 2;
    const uppercase = options.uppercase ?? true;

    let result = sql.replace(/\s+/g, ' ').trim();

    // Add line breaks before major keywords
    for (const kw of MAJOR_KEYWORDS) {
      const pattern = new RegExp(`\\b${kw}\\b`, 'gi');
      result = result.replace(pattern, `\n${kw}`);
    }

    // Indent JOIN clauses
    for (const kw of JOIN_KEYWORDS) {
      const pattern = new RegExp(`\\b${kw}\\b`, 'gi');
      result = result.replace(pattern, `\n${' '.repeat(indent)}${kw}`);
    }

    // Indent AND/OR within WHERE
    result = result.replace(/\b(AND|OR)\b/gi, (match) => {
      return `\n${' '.repeat(indent)}${match}`;
    });

    // Apply case
    if (uppercase) {
      const allKeywords = [...MAJOR_KEYWORDS, ...JOIN_KEYWORDS, ...INLINE_KEYWORDS];
      for (const kw of allKeywords) {
        const pattern = new RegExp(`\\b${kw}\\b`, 'gi');
        result = result.replace(pattern, kw.toUpperCase());
      }
    }

    return result.trim();
  }

  /**
   * Compact a multi-line SQL into a single line, useful for logging.
   */
  compact(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
  }

  /**
   * Replace all literals with placeholders. Useful for query fingerprinting.
   */
  parameterize(sql: string): { template: string; params: any[] } {
    const params: any[] = [];
    let counter = 0;

    const template = sql.replace(/'([^']*)'|"([^"]*)"|\b(\d+(\.\d+)?)\b/g, (m, single, double, num) => {
      if (single !== undefined) params.push(single);
      else if (double !== undefined) params.push(double);
      else if (num !== undefined) params.push(parseFloat(num));
      counter++;
      return '?';
    });

    return { template, params };
  }

  /**
   * Detect comments and remove them from SQL.
   */
  stripComments(sql: string): string {
    return sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract table names referenced in SQL (best-effort).
   */
  extractTables(sql: string): string[] {
    const tables = new Set<string>();
    const cleaned = this.stripComments(sql);

    const patterns = [
      /FROM\s+([\w.]+)(?:\s+(?:AS\s+)?(\w+))?/gi,
      /JOIN\s+([\w.]+)(?:\s+(?:AS\s+)?(\w+))?/gi,
      /UPDATE\s+([\w.]+)/gi,
      /INSERT\s+INTO\s+([\w.]+)/gi,
      /DELETE\s+FROM\s+([\w.]+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(cleaned)) !== null) {
        const table = match[1].split('.').pop();
        if (table) tables.add(table);
      }
    }

    return Array.from(tables);
  }

  /**
   * Estimate complexity of a SQL query (used for risk scoring).
   */
  estimateComplexity(sql: string): {
    joinCount: number;
    subqueryCount: number;
    aggregateCount: number;
    score: number;
  } {
    const cleaned = this.stripComments(sql);
    const joinCount = (cleaned.match(/\bJOIN\b/gi) || []).length;
    const subqueryCount = (cleaned.match(/\(\s*SELECT/gi) || []).length;
    const aggregateCount = (cleaned.match(/\b(COUNT|SUM|AVG|MAX|MIN|GROUP_CONCAT)\s*\(/gi) || []).length;

    const score = joinCount * 5 + subqueryCount * 8 + aggregateCount * 2;

    return { joinCount, subqueryCount, aggregateCount, score };
  }
}
