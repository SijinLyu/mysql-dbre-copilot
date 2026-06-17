import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { AuditLogger } from '../../src/audit/index.js';
import { createAuditRouter } from '../../src/api/routes/audit.js';
import { RiskLevel } from '../../src/safety/types.js';

describe('Audit REST API', () => {
  const testDbPath = path.join(process.cwd(), 'test-audit-route.db');
  let app: express.Express;
  let logger: AuditLogger;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    logger = new AuditLogger(testDbPath);
    // Wait for sql.js init via private store before inserting
    await (logger as any).store.ensureReady();

    const fakeReport = (level: RiskLevel, score: number) => ({
      sqlType: 'SELECT' as const,
      riskLevel: level,
      riskScore: score,
      checks: [],
      warnings: [],
      blockers: [],
      explainAnalysis: null,
    });

    logger.log({
      sessionId: 's1',
      connectionId: 'c1',
      database: 'demo',
      userMessage: 'count users',
      generatedSql: 'SELECT COUNT(*) FROM users',
      safetyReport: fakeReport(RiskLevel.LOW, 5) as any,
      executed: true,
      executionTimeMs: 12,
      rowCount: 1,
    });

    logger.log({
      sessionId: 's1',
      connectionId: 'c1',
      database: 'demo',
      userMessage: 'drop table',
      generatedSql: 'DROP TABLE users',
      safetyReport: fakeReport(RiskLevel.CRITICAL, 95) as any,
      executed: false,
      error: 'Blocked by safety policy',
    });

    app = express();
    app.use(express.json());
    app.use('/api/audit', createAuditRouter(logger));
  });

  afterAll(() => {
    logger.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('lists entries', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBe(2);
    expect(res.body.count).toBe(2);
  });

  it('filters by risk level', async () => {
    const res = await request(app).get('/api/audit?riskLevel=critical');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBe(1);
    expect(res.body.entries[0].riskLevel).toBe('critical');
    expect(res.body.entries[0].executed).toBe(false);
  });

  it('returns aggregate stats', async () => {
    const res = await request(app).get('/api/audit/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byRisk.low).toBe(1);
    expect(res.body.byRisk.critical).toBe(1);
    expect(res.body.avgScore).toBe(50);
  });

  it('respects limit', async () => {
    const res = await request(app).get('/api/audit?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBe(1);
  });

  it('waits for store initialization before querying a fresh logger', async () => {
    const freshDbPath = path.join(process.cwd(), 'test-audit-route-fresh.db');
    if (fs.existsSync(freshDbPath)) fs.unlinkSync(freshDbPath);
    const freshLogger = new AuditLogger(freshDbPath);
    const freshApp = express();
    freshApp.use('/api/audit', createAuditRouter(freshLogger));

    try {
      const res = await request(freshApp).get('/api/audit');
      expect(res.status).toBe(200);
      expect(res.body.entries).toEqual([]);
    } finally {
      freshLogger.close();
      if (fs.existsSync(freshDbPath)) fs.unlinkSync(freshDbPath);
    }
  });
});
