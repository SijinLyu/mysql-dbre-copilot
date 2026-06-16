import { AuditStore } from '../../../src/audit/audit-store.js';
import { RiskLevel } from '../../../src/safety/types.js';
import { AuditEntry } from '../../../src/audit/types.js';
import fs from 'fs';
import path from 'path';

describe('AuditStore', () => {
  let store: AuditStore;
  const testDbPath = path.join(process.cwd(), 'test-audit.db');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    store = new AuditStore(testDbPath);
  });

  afterEach(() => {
    store.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  const createEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
    id: 'test-id-1',
    sessionId: 'session-1',
    connectionId: 'conn-1',
    database: 'test_db',
    timestamp: new Date().toISOString(),
    userMessage: 'Show me top products',
    generatedSql: 'SELECT * FROM products LIMIT 10',
    riskLevel: RiskLevel.LOW,
    riskScore: 10,
    executed: true,
    executionTimeMs: 45,
    rowCount: 10,
    error: null,
    ...overrides,
  });

  it('inserts and queries entries', () => {
    store.insert(createEntry());
    const results = store.query();
    expect(results).toHaveLength(1);
    expect(results[0].userMessage).toBe('Show me top products');
  });

  it('filters by session ID', () => {
    store.insert(createEntry({ id: '1', sessionId: 'a' }));
    store.insert(createEntry({ id: '2', sessionId: 'b' }));

    const results = store.query({ sessionId: 'a' });
    expect(results).toHaveLength(1);
    expect(results[0].sessionId).toBe('a');
  });

  it('filters by risk level', () => {
    store.insert(createEntry({ id: '1', riskLevel: RiskLevel.LOW }));
    store.insert(createEntry({ id: '2', riskLevel: RiskLevel.HIGH }));

    const results = store.query({ riskLevel: RiskLevel.HIGH });
    expect(results).toHaveLength(1);
    expect(results[0].riskLevel).toBe('high');
  });

  it('returns stats', () => {
    store.insert(createEntry({ id: '1', riskLevel: RiskLevel.LOW, riskScore: 10 }));
    store.insert(createEntry({ id: '2', riskLevel: RiskLevel.LOW, riskScore: 20 }));
    store.insert(createEntry({ id: '3', riskLevel: RiskLevel.HIGH, riskScore: 70 }));

    const stats = store.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byRisk['low']).toBe(2);
    expect(stats.byRisk['high']).toBe(1);
    expect(stats.avgScore).toBeGreaterThan(0);
  });

  it('supports pagination', () => {
    for (let i = 0; i < 10; i++) {
      store.insert(createEntry({ id: `id-${i}` }));
    }

    const page1 = store.query({ limit: 3, offset: 0 });
    const page2 = store.query({ limit: 3, offset: 3 });
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
    expect(page1[0].id).not.toBe(page2[0].id);
  });
});
