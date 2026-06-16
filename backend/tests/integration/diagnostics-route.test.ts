import express from 'express';
import request from 'supertest';
import { createDiagnosticsRouter } from '../../src/api/routes/diagnostics.js';
import { SchemaCache } from '../../src/schema/index.js';

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const schemaCache = new SchemaCache();
  app.use('/api/diagnostics', createDiagnosticsRouter(schemaCache));
  return app;
}

describe('Diagnostics REST API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildApp();
  });

  describe('POST /api/diagnostics/slow-log', () => {
    const SAMPLE = `# Time: 2026-06-15T10:30:00.000000Z
# User@Host: root[root] @ localhost []  Id: 1
# Query_time: 3.2  Lock_time: 0.000123 Rows_sent: 5  Rows_examined: 100000
SET timestamp=1718448600;
use demo;
SELECT * FROM orders WHERE customer_id = 42;
# Time: 2026-06-15T10:31:00.000000Z
# User@Host: root[root] @ localhost []  Id: 2
# Query_time: 1.5  Lock_time: 0.000050 Rows_sent: 1  Rows_examined: 50000
SET timestamp=1718448660;
use demo;
SELECT * FROM orders WHERE customer_id = 99;
`;

    it('rejects empty body', async () => {
      const res = await request(app).post('/api/diagnostics/slow-log').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/content/i);
    });

    it('rejects oversize input', async () => {
      const big = 'x'.repeat(5_000_001);
      const res = await request(app).post('/api/diagnostics/slow-log').send({ content: big });
      expect(res.status).toBe(413);
    });

    it('parses sample and returns stats + fingerprints', async () => {
      const res = await request(app).post('/api/diagnostics/slow-log').send({ content: SAMPLE });
      expect(res.status).toBe(200);
      expect(res.body.entryCount).toBe(2);
      expect(res.body.stats.totalQueries).toBe(2);
      expect(res.body.stats.maxQueryTimeMs).toBeGreaterThan(0);
      expect(res.body.fingerprints.length).toBeGreaterThan(0);
      expect(res.body.fingerprints[0]).toHaveProperty('fingerprint');
      expect(res.body.fingerprints[0]).toHaveProperty('count');
    });

    it('groups identical-shape queries into one fingerprint', async () => {
      const res = await request(app).post('/api/diagnostics/slow-log').send({ content: SAMPLE });
      expect(res.status).toBe(200);
      // Both sample queries differ only in the literal — should collapse to 1 group.
      expect(res.body.fingerprints.length).toBe(1);
      expect(res.body.fingerprints[0].count).toBe(2);
    });
  });

  describe('POST /api/diagnostics/pii-scan', () => {
    it('returns 400 if sql missing', async () => {
      const res = await request(app).post('/api/diagnostics/pii-scan').send({});
      expect(res.status).toBe(400);
    });

    it('detects PII columns', async () => {
      const res = await request(app)
        .post('/api/diagnostics/pii-scan')
        .send({ sql: 'SELECT password, ssn FROM users' });
      expect(res.status).toBe(200);
      expect(res.body.matchCount).toBeGreaterThan(0);
      expect(res.body.severity).toBe('high');
      expect(res.body.summary).toMatch(/auth|identity/i);
    });

    it('returns clean for innocuous SQL', async () => {
      const res = await request(app)
        .post('/api/diagnostics/pii-scan')
        .send({ sql: 'SELECT id, created_at FROM products' });
      expect(res.status).toBe(200);
      expect(res.body.matchCount).toBe(0);
      expect(res.body.severity).toBe('none');
    });
  });

  describe('GET /api/diagnostics/index-redundancy/:connId/:db', () => {
    it('returns 404 when the connection is not registered', async () => {
      const res = await request(app).get('/api/diagnostics/index-redundancy/missing/demo');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/diagnostics/plan', () => {
    it('returns 400 when body is missing', async () => {
      const res = await request(app).post('/api/diagnostics/plan').send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 when connection is missing', async () => {
      const res = await request(app)
        .post('/api/diagnostics/plan')
        .send({ connectionId: 'nope', sql: 'SELECT 1' });
      expect(res.status).toBe(404);
    });
  });
});
