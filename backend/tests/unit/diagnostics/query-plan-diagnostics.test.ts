import { QueryPlanDiagnostics } from '../../../src/diagnostics/query-plan-diagnostics.js';
import { ExplainAnalysis } from '../../../src/safety/types.js';

describe('QueryPlanDiagnostics', () => {
  let diagnostics: QueryPlanDiagnostics;

  beforeEach(() => {
    diagnostics = new QueryPlanDiagnostics();
  });

  const buildAnalysis = (overrides: Partial<ExplainAnalysis> = {}): ExplainAnalysis => ({
    rows: [{
      id: 1,
      select_type: 'SIMPLE',
      table: 'users',
      type: 'ALL',
      possible_keys: null,
      key: null,
      key_len: null,
      ref: null,
      rows: 10000,
      filtered: 100,
      Extra: '',
    }],
    hasFullTableScan: true,
    hasFilesort: false,
    hasTempTable: false,
    estimatedRows: 10000,
    warnings: [],
    ...overrides,
  });

  describe('diagnose', () => {
    it('flags full table scan as critical', () => {
      const result = diagnostics.diagnose(buildAnalysis());
      const critical = result.issues.filter(i => i.severity === 'critical');
      expect(critical.length).toBeGreaterThan(0);
    });

    it('flags filesort', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'users', type: 'ref',
          possible_keys: 'idx', key: 'idx', key_len: '4', ref: 'const',
          rows: 100, filtered: 100, Extra: 'Using filesort',
        }],
        hasFullTableScan: false, hasFilesort: true,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.issues.some(i => i.category === 'sort')).toBe(true);
    });

    it('flags temporary table', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'orders', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 50000, filtered: 100, Extra: 'Using temporary',
        }],
        hasTempTable: true,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.issues.some(i => i.category === 'temp')).toBe(true);
    });

    it('flags join buffer (BNL)', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'a', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 100, filtered: 100, Extra: 'Using join buffer (Block Nested Loop)',
        }],
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.issues.some(i => i.category === 'join')).toBe(true);
    });

    it('flags very large row estimates', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'logs', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 5_000_000, filtered: 100, Extra: '',
        }],
        estimatedRows: 5_000_000,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.issues.some(i => i.category === 'estimation' && i.severity === 'critical')).toBe(true);
    });

    it('flags low selectivity', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'logs', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 100000, filtered: 5, Extra: '',
        }],
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.issues.some(i => i.category === 'estimation')).toBe(true);
    });

    it('returns clean report for healthy query', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'users', type: 'const',
          possible_keys: 'PRIMARY', key: 'PRIMARY', key_len: '4', ref: 'const',
          rows: 1, filtered: 100, Extra: '',
        }],
        hasFullTableScan: false, estimatedRows: 1,
      });
      const result = diagnostics.diagnose(analysis);
      const critical = result.issues.filter(i => i.severity === 'critical');
      expect(critical).toHaveLength(0);
      expect(result.score.overall).toBeGreaterThan(80);
    });
  });

  describe('score', () => {
    it('healthy plan scores high', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'users', type: 'const',
          possible_keys: 'PRIMARY', key: 'PRIMARY', key_len: '4', ref: 'const',
          rows: 1, filtered: 100, Extra: '',
        }],
        hasFullTableScan: false, estimatedRows: 1,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.score.overall).toBeGreaterThanOrEqual(90);
    });

    it('full scan + filesort scores low', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'orders', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 100000, filtered: 100, Extra: 'Using filesort; Using temporary',
        }],
        hasFullTableScan: true, hasFilesort: true, hasTempTable: true,
        estimatedRows: 100000,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.score.overall).toBeLessThan(70);
    });
  });

  describe('summary', () => {
    it('mentions critical issues count', () => {
      const result = diagnostics.diagnose(buildAnalysis({
        estimatedRows: 100000,
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'logs', type: 'ALL',
          possible_keys: null, key: null, key_len: null, ref: null,
          rows: 100000, filtered: 100, Extra: '',
        }],
      }));
      expect(result.summary).toContain('critical');
    });

    it('reports healthy when no issues', () => {
      const analysis = buildAnalysis({
        rows: [{
          id: 1, select_type: 'SIMPLE', table: 'users', type: 'const',
          possible_keys: 'PRIMARY', key: 'PRIMARY', key_len: '4', ref: 'const',
          rows: 1, filtered: 100, Extra: '',
        }],
        hasFullTableScan: false, estimatedRows: 1,
      });
      const result = diagnostics.diagnose(analysis);
      expect(result.summary.toLowerCase()).toMatch(/healthy|good|clean/);
    });
  });
});
