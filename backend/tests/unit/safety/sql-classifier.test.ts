import { SqlClassifier } from '../../../src/safety/sql-classifier.js';

describe('SqlClassifier', () => {
  let classifier: SqlClassifier;

  beforeEach(() => {
    classifier = new SqlClassifier();
  });

  describe('classify', () => {
    it('classifies SELECT queries', () => {
      expect(classifier.classify('SELECT * FROM users')).toBe('SELECT');
      expect(classifier.classify('  SELECT id FROM orders')).toBe('SELECT');
      expect(classifier.classify('select count(*) from products')).toBe('SELECT');
    });

    it('classifies WITH (CTE) as SELECT', () => {
      expect(classifier.classify('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe('SELECT');
    });

    it('classifies INSERT queries', () => {
      expect(classifier.classify('INSERT INTO users (name) VALUES ("test")')).toBe('INSERT');
    });

    it('classifies UPDATE queries', () => {
      expect(classifier.classify('UPDATE users SET name = "test" WHERE id = 1')).toBe('UPDATE');
    });

    it('classifies DELETE queries', () => {
      expect(classifier.classify('DELETE FROM users WHERE id = 1')).toBe('DELETE');
    });

    it('classifies DDL statements', () => {
      expect(classifier.classify('CREATE TABLE test (id INT)')).toBe('DDL');
      expect(classifier.classify('ALTER TABLE users ADD COLUMN age INT')).toBe('DDL');
      expect(classifier.classify('DROP TABLE users')).toBe('DDL');
      expect(classifier.classify('TRUNCATE TABLE logs')).toBe('DDL');
    });

    it('classifies SHOW/DESCRIBE/EXPLAIN as SELECT (read-only)', () => {
      expect(classifier.classify('EXPLAIN SELECT * FROM users')).toBe('SELECT');
      expect(classifier.classify('SHOW TABLES')).toBe('SELECT');
      expect(classifier.classify('DESCRIBE users')).toBe('SELECT');
    });

    it('classifies stored procedure calls as OTHER', () => {
      expect(classifier.classify('CALL my_proc()')).toBe('OTHER');
    });
  });

  describe('isReadOnly', () => {
    it('returns true for SELECT', () => {
      expect(classifier.isReadOnly('SELECT * FROM users')).toBe(true);
    });

    it('returns false for write operations', () => {
      expect(classifier.isReadOnly('INSERT INTO users VALUES (1)')).toBe(false);
      expect(classifier.isReadOnly('UPDATE users SET x = 1')).toBe(false);
      expect(classifier.isReadOnly('DELETE FROM users')).toBe(false);
      expect(classifier.isReadOnly('DROP TABLE users')).toBe(false);
    });
  });

  describe('containsMultipleStatements', () => {
    it('detects multiple statements', () => {
      expect(classifier.containsMultipleStatements('SELECT 1; SELECT 2')).toBe(true);
    });

    it('allows single statements', () => {
      expect(classifier.containsMultipleStatements('SELECT * FROM users')).toBe(false);
    });

    it('ignores semicolons in strings', () => {
      expect(classifier.containsMultipleStatements("SELECT * FROM users WHERE name = 'a;b'")).toBe(false);
    });
  });
});
