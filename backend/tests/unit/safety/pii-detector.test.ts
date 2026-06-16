import { PiiDetector } from '../../../src/safety/pii-detector.js';

describe('PiiDetector', () => {
  let detector: PiiDetector;

  beforeEach(() => {
    detector = new PiiDetector();
  });

  describe('scan', () => {
    it('detects password column', () => {
      const matches = detector.scan('SELECT id, password FROM users');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].pattern.name).toBe('password');
    });

    it('detects API tokens', () => {
      const matches = detector.scan('SELECT api_key FROM service_credentials');
      expect(matches.some(m => m.category === 'auth')).toBe(true);
    });

    it('detects SSN/national ID', () => {
      const matches = detector.scan('SELECT name, ssn FROM employees');
      expect(matches.some(m => m.pattern.name === 'ssn')).toBe(true);
    });

    it('detects credit card data', () => {
      const matches = detector.scan('SELECT card_number, password FROM payments');
      expect(matches.some(m => m.category === 'financial')).toBe(true);
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('detects bank account info', () => {
      const matches = detector.scan('SELECT bank_account, routing_number FROM accounts');
      expect(matches.some(m => m.pattern.name === 'bank_account')).toBe(true);
    });

    it('detects medical records', () => {
      const matches = detector.scan('SELECT diagnosis FROM medical_records');
      expect(matches.some(m => m.category === 'health')).toBe(true);
    });

    it('does not flag innocuous columns', () => {
      const matches = detector.scan('SELECT id, name, email, created_at FROM users');
      expect(matches.length).toBe(0);
    });

    it('deduplicates within a single scan', () => {
      const matches = detector.scan('SELECT password, password AS pwd FROM users');
      // pattern is matched once even if column appears multiple times
      const passwordMatches = matches.filter(m => m.pattern.name === 'password');
      expect(passwordMatches.length).toBe(1);
    });
  });

  describe('getHighestSeverity', () => {
    it('returns "none" for empty matches', () => {
      expect(detector.getHighestSeverity([])).toBe('none');
    });

    it('returns "high" when any match is high severity', () => {
      const matches = detector.scan('SELECT password, phone_number FROM users');
      expect(detector.getHighestSeverity(matches)).toBe('high');
    });

    it('returns "low" when only low severity matches', () => {
      const matches = detector.scan('SELECT phone_number FROM users');
      expect(detector.getHighestSeverity(matches)).toBe('low');
    });
  });

  describe('groupByCategory', () => {
    it('groups matches by category', () => {
      const matches = detector.scan(
        'SELECT password, credit_card, ssn FROM users JOIN payments ON users.id = payments.user_id'
      );
      const groups = detector.groupByCategory(matches);
      expect(groups.auth).toBeDefined();
      expect(groups.financial).toBeDefined();
      expect(groups.identity).toBeDefined();
    });
  });

  describe('summarize', () => {
    it('returns clean message for empty matches', () => {
      expect(detector.summarize([])).toContain('No sensitive');
    });

    it('builds a categorized summary', () => {
      const matches = detector.scan('SELECT password FROM users');
      const summary = detector.summarize(matches);
      expect(summary).toContain('auth');
      expect(summary).toContain('password');
    });
  });

  describe('addPattern', () => {
    it('allows custom patterns', () => {
      detector.addPattern({
        name: 'biometric',
        category: 'identity',
        pattern: /\b(fingerprint|iris_scan|face_id)\b/i,
        severity: 'high',
        description: 'Biometric data',
      });

      const matches = detector.scan('SELECT fingerprint FROM identity');
      expect(matches.some(m => m.pattern.name === 'biometric')).toBe(true);
    });
  });
});
