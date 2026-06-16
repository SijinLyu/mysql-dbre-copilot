import { SqlType } from './types.js';

const DDL_KEYWORDS = [
  'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'GRANT', 'REVOKE',
];

const DML_WRITE_PATTERNS = [
  /^\s*INSERT\s/i,
  /^\s*UPDATE\s/i,
  /^\s*DELETE\s/i,
  /^\s*REPLACE\s/i,
];

export class SqlClassifier {
  classify(sql: string): SqlType {
    const trimmed = sql.trim().toUpperCase();

    // Check DDL first
    for (const keyword of DDL_KEYWORDS) {
      if (trimmed.startsWith(keyword)) {
        return 'DDL';
      }
    }

    // Check DML writes
    if (/^\s*INSERT\s/i.test(sql)) return 'INSERT';
    if (/^\s*UPDATE\s/i.test(sql)) return 'UPDATE';
    if (/^\s*DELETE\s/i.test(sql)) return 'DELETE';

    // SELECT (including WITH ... SELECT, SHOW, DESCRIBE, EXPLAIN)
    if (/^\s*(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\s/i.test(sql)) return 'SELECT';

    return 'OTHER';
  }

  isReadOnly(sql: string): boolean {
    const type = this.classify(sql);
    return type === 'SELECT';
  }

  isWriteOperation(sql: string): boolean {
    const type = this.classify(sql);
    return type === 'INSERT' || type === 'UPDATE' || type === 'DELETE' || type === 'DDL';
  }

  containsMultipleStatements(sql: string): boolean {
    // Remove strings and comments, then check for semicolons
    const cleaned = sql
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const statements = cleaned.split(';').filter(s => s.trim().length > 0);
    return statements.length > 1;
  }
}
