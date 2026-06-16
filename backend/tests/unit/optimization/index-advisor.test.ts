import { IndexAdvisor } from '../../../src/optimization/index-advisor.js';
import { ExplainAnalysis } from '../../../src/safety/types.js';

describe('IndexAdvisor', () => {
  let advisor: IndexAdvisor;

  beforeEach(() => {
    advisor = new IndexAdvisor();
  });

  it('suggests index for full table scan', () => {
    const explain: ExplainAnalysis = {
      rows: [{
        id: 1,
        select_type: 'SIMPLE',
        table: 'orders',
        type: 'ALL',
        possible_keys: null,
        key: null,
        key_len: null,
        ref: null,
        rows: 50000,
        filtered: 10,
        Extra: 'Using where',
      }],
      hasFullTableScan: true,
      hasFilesort: false,
      hasTempTable: false,
      estimatedRows: 50000,
      warnings: [],
    };

    const suggestions = advisor.analyze(
      'SELECT * FROM orders WHERE status = "pending" AND customer_id = 5',
      explain
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].table).toBe('orders');
    expect(suggestions[0].createStatement).toContain('CREATE INDEX');
  });

  it('suggests index for filesort', () => {
    const explain: ExplainAnalysis = {
      rows: [{
        id: 1,
        select_type: 'SIMPLE',
        table: 'products',
        type: 'ref',
        possible_keys: 'idx_category',
        key: 'idx_category',
        key_len: '102',
        ref: 'const',
        rows: 500,
        filtered: 100,
        Extra: 'Using filesort',
      }],
      hasFullTableScan: false,
      hasFilesort: true,
      hasTempTable: false,
      estimatedRows: 500,
      warnings: [],
    };

    const suggestions = advisor.analyze(
      'SELECT * FROM products WHERE category = "Electronics" ORDER BY price DESC LIMIT 100',
      explain
    );

    expect(suggestions.length).toBeGreaterThan(0);
    const sortSuggestion = suggestions.find(s => s.reason.toLowerCase().includes('filesort'));
    expect(sortSuggestion).toBeDefined();
  });

  it('returns empty for queries without issues', () => {
    const explain: ExplainAnalysis = {
      rows: [{
        id: 1,
        select_type: 'SIMPLE',
        table: 'users',
        type: 'const',
        possible_keys: 'PRIMARY',
        key: 'PRIMARY',
        key_len: '4',
        ref: 'const',
        rows: 1,
        filtered: 100,
        Extra: '',
      }],
      hasFullTableScan: false,
      hasFilesort: false,
      hasTempTable: false,
      estimatedRows: 1,
      warnings: [],
    };

    const suggestions = advisor.analyze('SELECT * FROM users WHERE id = 1', explain);
    expect(suggestions).toHaveLength(0);
  });
});
