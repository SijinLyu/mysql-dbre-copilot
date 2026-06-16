import { RiskScorer } from '../../../src/safety/risk-scorer.js';
import { RiskLevel } from '../../../src/safety/types.js';

describe('RiskScorer', () => {
  let scorer: RiskScorer;

  beforeEach(() => {
    scorer = new RiskScorer();
  });

  it('scores a safe SELECT as LOW risk', () => {
    const report = scorer.score({
      sqlType: 'SELECT',
      checks: [
        { name: 'select_star', passed: true, severity: 'warning', message: '' },
        { name: 'missing_limit', passed: true, severity: 'warning', message: '' },
        { name: 'missing_where', passed: true, severity: 'error', message: '' },
        { name: 'sensitive_columns', passed: true, severity: 'warning', message: '' },
      ],
      explainAnalysis: null,
    });

    expect(report.riskLevel).toBe(RiskLevel.LOW);
    expect(report.riskScore).toBeLessThanOrEqual(20);
    expect(report.executionAllowed).toBe(true);
    expect(report.recommendation).toBe('execute');
  });

  it('scores DELETE without WHERE as HIGH/CRITICAL', () => {
    const report = scorer.score({
      sqlType: 'DELETE',
      checks: [
        { name: 'missing_where', passed: false, severity: 'error', message: 'No WHERE clause' },
        { name: 'select_star', passed: true, severity: 'warning', message: '' },
      ],
      explainAnalysis: null,
    });

    expect(report.riskScore).toBeGreaterThan(60);
    expect(report.executionAllowed).toBe(false);
    expect(report.recommendation).toBe('reject');
  });

  it('scores DDL as HIGH risk', () => {
    const report = scorer.score({
      sqlType: 'DDL',
      checks: [],
      explainAnalysis: null,
    });

    expect(report.riskLevel).toBe(RiskLevel.CRITICAL);
    expect(report.executionAllowed).toBe(false);
  });

  it('includes EXPLAIN penalties for full table scan', () => {
    const report = scorer.score({
      sqlType: 'SELECT',
      checks: [
        { name: 'select_star', passed: true, severity: 'warning', message: '' },
      ],
      explainAnalysis: {
        rows: [{ id: 1, select_type: 'SIMPLE', table: 'users', type: 'ALL', possible_keys: null, key: null, key_len: null, ref: null, rows: 500000, filtered: 100, Extra: '' }],
        hasFullTableScan: true,
        hasFilesort: false,
        hasTempTable: false,
        estimatedRows: 500000,
        warnings: ['Full table scan on: users'],
      },
    });

    expect(report.riskScore).toBeGreaterThan(20);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it('MEDIUM risk allows execution with warning', () => {
    const report = scorer.score({
      sqlType: 'SELECT',
      checks: [
        { name: 'select_star', passed: false, severity: 'warning', message: 'Uses SELECT *' },
        { name: 'missing_limit', passed: false, severity: 'warning', message: 'No LIMIT' },
        { name: 'sensitive_columns', passed: false, severity: 'warning', message: 'Accesses password' },
      ],
      explainAnalysis: null,
    });

    expect(report.riskLevel).toBe(RiskLevel.MEDIUM);
    expect(report.recommendation).toBe('warn');
    expect(report.executionAllowed).toBe(true);
  });
});
