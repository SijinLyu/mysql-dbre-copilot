import { SqlFormatter } from '../../../src/utils/sql-formatter.js';

describe('SqlFormatter', () => {
  let formatter: SqlFormatter;

  beforeEach(() => {
    formatter = new SqlFormatter();
  });

  describe('format', () => {
    it('formats simple SELECT', () => {
      const sql = 'SELECT id, name FROM users WHERE id = 1';
      const result = formatter.format(sql);
      expect(result).toContain('SELECT');
      expect(result).toContain('FROM');
      expect(result).toContain('WHERE');
    });

    it('breaks lines on major keywords', () => {
      const sql = 'SELECT * FROM users WHERE active = 1 ORDER BY id LIMIT 10';
      const result = formatter.format(sql);
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(2);
    });

    it('uppercases keywords by default', () => {
      const result = formatter.format('select id from users where active = 1');
      expect(result).toContain('SELECT');
      expect(result).toContain('WHERE');
    });

    it('respects uppercase option', () => {
      const result = formatter.format('select id from users', { uppercase: false });
      expect(result.toLowerCase()).toContain('select');
    });
  });

  describe('compact', () => {
    it('collapses whitespace into single spaces', () => {
      const sql = 'SELECT *\n  FROM   users\n  WHERE\n      id = 1';
      const result = formatter.compact(sql);
      expect(result).toBe('SELECT * FROM users WHERE id = 1');
    });
  });

  describe('parameterize', () => {
    it('replaces string literals with placeholders', () => {
      const result = formatter.parameterize("SELECT * FROM users WHERE name = 'alice'");
      expect(result.template).toBe('SELECT * FROM users WHERE name = ?');
      expect(result.params).toEqual(['alice']);
    });

    it('replaces numeric literals with placeholders', () => {
      const result = formatter.parameterize('SELECT * FROM orders WHERE id = 42');
      expect(result.template).toContain('?');
      expect(result.params).toContain(42);
    });

    it('handles multiple literals', () => {
      const result = formatter.parameterize("SELECT * FROM x WHERE a = 1 AND b = 'foo' AND c = 3.14");
      expect(result.params.length).toBe(3);
    });
  });

  describe('stripComments', () => {
    it('removes single-line comments', () => {
      const result = formatter.stripComments('SELECT id -- this is a comment\nFROM users');
      expect(result).not.toContain('--');
      expect(result).not.toContain('comment');
    });

    it('removes multi-line comments', () => {
      const result = formatter.stripComments('SELECT id /* block comment */ FROM users');
      expect(result).not.toContain('/*');
      expect(result).not.toContain('block');
    });
  });

  describe('extractTables', () => {
    it('extracts FROM table', () => {
      const tables = formatter.extractTables('SELECT * FROM users');
      expect(tables).toContain('users');
    });

    it('extracts JOIN tables', () => {
      const tables = formatter.extractTables(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id'
      );
      expect(tables).toContain('users');
      expect(tables).toContain('orders');
    });

    it('handles UPDATE/DELETE/INSERT', () => {
      expect(formatter.extractTables('UPDATE users SET x = 1')).toContain('users');
      expect(formatter.extractTables('DELETE FROM logs')).toContain('logs');
      expect(formatter.extractTables('INSERT INTO products VALUES (1)')).toContain('products');
    });

    it('handles schema-qualified tables', () => {
      const tables = formatter.extractTables('SELECT * FROM analytics.events');
      expect(tables).toContain('events');
    });
  });

  describe('estimateComplexity', () => {
    it('counts joins', () => {
      const result = formatter.estimateComplexity(
        'SELECT * FROM a JOIN b ON a.id = b.id LEFT JOIN c ON c.id = a.id'
      );
      expect(result.joinCount).toBe(2);
    });

    it('counts subqueries', () => {
      const result = formatter.estimateComplexity(
        'SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)'
      );
      expect(result.subqueryCount).toBe(1);
    });

    it('counts aggregates', () => {
      const result = formatter.estimateComplexity(
        'SELECT COUNT(*), SUM(price), AVG(amount) FROM orders'
      );
      expect(result.aggregateCount).toBe(3);
    });

    it('combines into a complexity score', () => {
      const simple = formatter.estimateComplexity('SELECT * FROM users');
      const complex = formatter.estimateComplexity(
        'SELECT COUNT(*), SUM(amount) FROM orders JOIN users ON orders.user_id = users.id WHERE id IN (SELECT id FROM filter)'
      );
      expect(complex.score).toBeGreaterThan(simple.score);
    });
  });
});
