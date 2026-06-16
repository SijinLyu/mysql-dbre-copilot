import { SlowQueryLogParser } from '../../../src/diagnostics/slow-query-log-parser.js';

describe('SlowQueryLogParser', () => {
  let parser: SlowQueryLogParser;

  beforeEach(() => {
    parser = new SlowQueryLogParser();
  });

  const sampleLog = `# Time: 2025-12-01T10:00:00.000000Z
# User@Host: app_user[app_user] @ localhost []  Id:    42
# Query_time: 1.523000  Lock_time: 0.000123 Rows_sent: 100  Rows_examined: 50000
SET timestamp=1701424800;
use shop;
SELECT * FROM orders WHERE customer_id = 5 ORDER BY created_at DESC;
# Time: 2025-12-01T10:01:00.000000Z
# User@Host: report_user[report_user] @ localhost []  Id:    43
# Query_time: 5.892000  Lock_time: 0.000456 Rows_sent: 50  Rows_examined: 1000000
SET timestamp=1701424860;
use analytics;
SELECT product_id, SUM(quantity) FROM sales GROUP BY product_id;`;

  describe('parse', () => {
    it('parses individual log entries', () => {
      const entries = parser.parse(sampleLog);
      expect(entries).toHaveLength(2);
    });

    it('extracts query time correctly', () => {
      const entries = parser.parse(sampleLog);
      expect(entries[0].queryTimeMs).toBe(1523);
      expect(entries[1].queryTimeMs).toBe(5892);
    });

    it('extracts user and host', () => {
      const entries = parser.parse(sampleLog);
      expect(entries[0].user).toBe('app_user');
      expect(entries[0].host).toBe('localhost');
      expect(entries[1].user).toBe('report_user');
    });

    it('extracts rows examined', () => {
      const entries = parser.parse(sampleLog);
      expect(entries[0].rowsExamined).toBe(50000);
      expect(entries[1].rowsExamined).toBe(1000000);
    });

    it('extracts database', () => {
      const entries = parser.parse(sampleLog);
      expect(entries[0].database).toBe('shop');
      expect(entries[1].database).toBe('analytics');
    });

    it('extracts SQL statement', () => {
      const entries = parser.parse(sampleLog);
      expect(entries[0].sql).toContain('SELECT * FROM orders');
      expect(entries[1].sql).toContain('GROUP BY product_id');
    });

    it('handles empty log', () => {
      expect(parser.parse('')).toHaveLength(0);
    });

    it('skips blocks without Query_time', () => {
      const partial = '# Time: 2025-12-01T10:00:00\nuse shop;\nSELECT 1;';
      expect(parser.parse(partial)).toHaveLength(0);
    });
  });

  describe('computeStats', () => {
    it('computes total queries', () => {
      const entries = parser.parse(sampleLog);
      const stats = parser.computeStats(entries);
      expect(stats.totalQueries).toBe(2);
    });

    it('computes average query time', () => {
      const entries = parser.parse(sampleLog);
      const stats = parser.computeStats(entries);
      expect(stats.avgQueryTimeMs).toBe(Math.round((1523 + 5892) / 2));
    });

    it('finds max query time', () => {
      const entries = parser.parse(sampleLog);
      const stats = parser.computeStats(entries);
      expect(stats.maxQueryTimeMs).toBe(5892);
    });

    it('groups by user', () => {
      const entries = parser.parse(sampleLog);
      const stats = parser.computeStats(entries);
      expect(stats.byUser['app_user']).toBe(1);
      expect(stats.byUser['report_user']).toBe(1);
    });

    it('returns top N slow queries sorted desc', () => {
      const entries = parser.parse(sampleLog);
      const stats = parser.computeStats(entries, 2);
      expect(stats.topSlowQueries).toHaveLength(2);
      expect(stats.topSlowQueries[0].queryTimeMs).toBe(5892);
      expect(stats.topSlowQueries[1].queryTimeMs).toBe(1523);
    });

    it('handles empty entries', () => {
      const stats = parser.computeStats([]);
      expect(stats.totalQueries).toBe(0);
      expect(stats.avgQueryTimeMs).toBe(0);
    });
  });

  describe('groupByFingerprint', () => {
    it('groups identical query patterns', () => {
      const entries = [
        { ...parser.parse(sampleLog)[0], sql: 'SELECT * FROM orders WHERE customer_id = 5' },
        { ...parser.parse(sampleLog)[0], sql: 'SELECT * FROM orders WHERE customer_id = 12' },
        { ...parser.parse(sampleLog)[0], sql: 'SELECT * FROM orders WHERE customer_id = 100' },
      ];
      const groups = parser.groupByFingerprint(entries);
      expect(groups.size).toBe(1);
    });

    it('different queries get different fingerprints', () => {
      const entries = [
        { ...parser.parse(sampleLog)[0], sql: 'SELECT * FROM orders' },
        { ...parser.parse(sampleLog)[0], sql: 'SELECT * FROM users' },
      ];
      const groups = parser.groupByFingerprint(entries);
      expect(groups.size).toBe(2);
    });

    it('aggregates timing per fingerprint', () => {
      const sample = parser.parse(sampleLog)[0];
      const entries = [
        { ...sample, sql: 'SELECT * FROM orders WHERE id = 1', queryTimeMs: 100 },
        { ...sample, sql: 'SELECT * FROM orders WHERE id = 2', queryTimeMs: 200 },
        { ...sample, sql: 'SELECT * FROM orders WHERE id = 3', queryTimeMs: 300 },
      ];
      const groups = parser.groupByFingerprint(entries);
      const group = Array.from(groups.values())[0];
      expect(group.count).toBe(3);
      expect(group.totalTimeMs).toBe(600);
      expect(group.avgTimeMs).toBe(200);
      expect(group.maxTimeMs).toBe(300);
    });
  });
});
