import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createChatRouter } from '../../src/api/routes/chat.js';
import { AuditLogger } from '../../src/audit/index.js';
import { RiskLevel } from '../../src/safety/types.js';

describe('Chat audit logging', () => {
  const testDbPath = path.join(process.cwd(), 'test-chat-audit-route.db');
  let auditLogger: AuditLogger;
  let app: express.Express;

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    auditLogger = new AuditLogger(testDbPath);
    await (auditLogger as any).store.ensureReady();

    const chatService = {
      processMessage: jest.fn().mockResolvedValue({
        id: 'msg-1',
        sessionId: 'session-1',
        message: 'There are 3 orders.',
        sql: 'SELECT COUNT(*) AS count FROM orders',
        results: [{ count: 3 }],
        resultCount: 1,
        executionTimeMs: 15,
        safetyReport: {
          riskLevel: RiskLevel.LOW,
          riskScore: 5,
          sqlType: 'SELECT',
          checks: [],
          recommendation: 'execute',
          suggestions: [],
          executionAllowed: true,
        },
        followUpSuggestions: [],
        timestamp: new Date(),
      }),
      getHistory: jest.fn().mockReturnValue([]),
      clearHistory: jest.fn(),
    };

    app = express();
    app.use(express.json());
    app.use('/api/chat', createChatRouter(chatService as any, auditLogger));
  });

  afterAll(() => {
    auditLogger.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('records successful chat-to-SQL interactions in audit log', async () => {
    const res = await request(app).post('/api/chat').send({
      sessionId: 'session-1',
      connectionId: 'demo',
      message: 'count orders',
      database: 'demo',
    });

    expect(res.status).toBe(200);

    const entries = auditLogger.query({ sessionId: 'session-1' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      sessionId: 'session-1',
      connectionId: 'demo',
      database: 'demo',
      userMessage: 'count orders',
      generatedSql: 'SELECT COUNT(*) AS count FROM orders',
      riskLevel: RiskLevel.LOW,
      riskScore: 5,
      executed: true,
      executionTimeMs: 15,
      rowCount: 1,
    });
  });
});
