import { StaticAnalyzer } from '../../../src/safety/static-analyzer.js';

describe('StaticAnalyzer', () => {
  let analyzer: StaticAnalyzer;

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
  });

  describe('SELECT * detection', () => {
    it('detects SELECT *', () => {
      const checks = analyzer.analyze('SELECT * FROM users');
      const check = checks.find(c => c.name === 'select_star');
      expect(check?.passed).toBe(false);
    });

    it('passes for specific columns', () => {
      const checks = analyzer.analyze('SELECT id, name FROM users');
      const check = checks.find(c => c.name === 'select_star');
      expect(check?.passed).toBe(true);
    });

    it('allows COUNT(*)', () => {
      const checks = analyzer.analyze('SELECT COUNT(*) FROM users');
      const check = checks.find(c => c.name === 'select_star');
      expect(check?.passed).toBe(true);
    });
  });

  describe('missing LIMIT detection', () => {
    it('detects missing LIMIT on SELECT', () => {
      const checks = analyzer.analyze('SELECT id FROM users WHERE active = 1');
      const check = checks.find(c => c.name === 'missing_limit');
      expect(check?.passed).toBe(false);
    });

    it('passes when LIMIT is present', () => {
      const checks = analyzer.analyze('SELECT id FROM users LIMIT 10');
      const check = checks.find(c => c.name === 'missing_limit');
      expect(check?.passed).toBe(true);
    });

    it('passes for aggregate without GROUP BY', () => {
      const checks = analyzer.analyze('SELECT COUNT(*) FROM users');
      const check = checks.find(c => c.name === 'missing_limit');
      expect(check?.passed).toBe(true);
    });
  });

  describe('missing WHERE on UPDATE/DELETE', () => {
    it('detects UPDATE without WHERE', () => {
      const checks = analyzer.analyze('UPDATE users SET active = 0');
      const check = checks.find(c => c.name === 'missing_where');
      expect(check?.passed).toBe(false);
      expect(check?.severity).toBe('error');
    });

    it('detects DELETE without WHERE', () => {
      const checks = analyzer.analyze('DELETE FROM users');
      const check = checks.find(c => c.name === 'missing_where');
      expect(check?.passed).toBe(false);
    });

    it('passes when WHERE is present', () => {
      const checks = analyzer.analyze('UPDATE users SET active = 0 WHERE id = 1');
      const check = checks.find(c => c.name === 'missing_where');
      expect(check?.passed).toBe(true);
    });
  });

  describe('sensitive columns detection', () => {
    it('detects password columns', () => {
      const checks = analyzer.analyze('SELECT password FROM users');
      const check = checks.find(c => c.name === 'sensitive_columns');
      expect(check?.passed).toBe(false);
    });

    it('detects token columns', () => {
      const checks = analyzer.analyze('SELECT api_key, token FROM sessions');
      const check = checks.find(c => c.name === 'sensitive_columns');
      expect(check?.passed).toBe(false);
    });

    it('passes for non-sensitive columns', () => {
      const checks = analyzer.analyze('SELECT id, name, email FROM users');
      const check = checks.find(c => c.name === 'sensitive_columns');
      expect(check?.passed).toBe(true);
    });
  });

  describe('cartesian join detection', () => {
    it('detects comma-separated tables without JOIN', () => {
      const checks = analyzer.analyze('SELECT * FROM users, orders WHERE users.id = orders.user_id');
      const check = checks.find(c => c.name === 'cartesian_join');
      expect(check?.passed).toBe(false);
    });

    it('passes for explicit JOIN', () => {
      const checks = analyzer.analyze('SELECT * FROM users JOIN orders ON users.id = orders.user_id');
      const check = checks.find(c => c.name === 'cartesian_join');
      expect(check?.passed).toBe(true);
    });
  });
});
