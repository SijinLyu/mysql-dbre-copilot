import { SlowQueryDiagnoser } from '../../../src/optimization/slow-query-diagnoser.js';

describe('SlowQueryDiagnoser', () => {
  let diagnoser: SlowQueryDiagnoser;

  beforeEach(() => {
    diagnoser = new SlowQueryDiagnoser();
  });

  it('detects leading wildcard in LIKE', () => {
    const patterns = diagnoser.diagnose("SELECT * FROM users WHERE name LIKE '%john%'");
    const pattern = patterns.find(p => p.name === 'leading_wildcard');
    expect(pattern?.detected).toBe(true);
    expect(pattern?.suggestion).toContain('full-text search');
  });

  it('does not flag trailing wildcard', () => {
    const patterns = diagnoser.diagnose("SELECT * FROM users WHERE name LIKE 'john%'");
    const pattern = patterns.find(p => p.name === 'leading_wildcard');
    expect(pattern?.detected).toBe(false);
  });

  it('detects subquery in WHERE', () => {
    const patterns = diagnoser.diagnose(
      'SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE city = "NY")'
    );
    const pattern = patterns.find(p => p.name === 'in_subquery');
    expect(pattern?.detected).toBe(true);
    expect(pattern?.suggestion).toContain('JOIN');
  });

  it('detects large OFFSET', () => {
    const patterns = diagnoser.diagnose('SELECT * FROM users LIMIT 10 OFFSET 50000');
    const pattern = patterns.find(p => p.name === 'large_offset');
    expect(pattern?.detected).toBe(true);
    expect(pattern?.suggestion).toContain('cursor-based');
  });

  it('does not flag small OFFSET', () => {
    const patterns = diagnoser.diagnose('SELECT * FROM users LIMIT 10 OFFSET 100');
    const pattern = patterns.find(p => p.name === 'large_offset');
    expect(pattern?.detected).toBe(false);
  });

  it('detects correlated subquery in WHERE', () => {
    const patterns = diagnoser.diagnose(
      'SELECT * FROM orders o WHERE EXISTS (SELECT 1 FROM items i WHERE i.order_id = o.id)'
    );
    const pattern = patterns.find(p => p.name === 'subquery_in_where');
    expect(pattern?.detected).toBe(true);
  });
});
