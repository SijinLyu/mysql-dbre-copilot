import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../services/api';

describe('api service', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  const mockResponse = (data: unknown, ok = true, status = 200) => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => data,
    } as Response);
  };

  describe('chat', () => {
    it('sends a chat message', async () => {
      mockResponse({ id: '1', message: 'ok' });
      const result = await api.chat.send('sess1', 'conn1', 'SELECT 1', 'demo');
      expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.message).toBe('ok');
    });

    it('gets chat history', async () => {
      mockResponse({ messages: [] });
      const result = await api.chat.getHistory('sess1');
      expect(global.fetch).toHaveBeenCalledWith('/api/chat/history/sess1', expect.anything());
      expect(result.messages).toEqual([]);
    });

    it('clears chat history', async () => {
      mockResponse({ success: true });
      await api.chat.clearHistory('sess1');
      expect(global.fetch).toHaveBeenCalledWith('/api/chat/history/sess1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  describe('connections', () => {
    it('lists connections', async () => {
      mockResponse({ connections: [] });
      const result = await api.connections.list();
      expect(global.fetch).toHaveBeenCalledWith('/api/connections', expect.anything());
      expect(result.connections).toEqual([]);
    });

    it('adds a connection', async () => {
      mockResponse({ id: 'c1', status: 'connected' });
      const result = await api.connections.add({
        id: 'c1', host: 'localhost', port: 3306, user: 'root', password: 'pw', database: 'demo',
      });
      expect(global.fetch).toHaveBeenCalledWith('/api/connections', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.id).toBe('c1');
    });

    it('removes a connection', async () => {
      mockResponse({ success: true });
      await api.connections.remove('c1');
      expect(global.fetch).toHaveBeenCalledWith('/api/connections/c1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  describe('schema', () => {
    it('gets schema for connection and database', async () => {
      mockResponse({ tables: ['users'] });
      const result = await api.schema.get('conn1', 'demo');
      expect(global.fetch).toHaveBeenCalledWith('/api/schema/conn1?database=demo', expect.anything());
      expect(result.tables).toContain('users');
    });
  });

  describe('audit', () => {
    it('lists audit entries with params', async () => {
      mockResponse({ entries: [{ id: '1' }] });
      const result = await api.audit.list({ limit: '50', riskLevel: 'HIGH' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/audit?limit=50&riskLevel=HIGH',
        expect.anything(),
      );
      expect(result.entries).toHaveLength(1);
    });

    it('lists audit entries without params', async () => {
      mockResponse({ entries: [] });
      await api.audit.list();
      expect(global.fetch).toHaveBeenCalledWith('/api/audit', expect.anything());
    });

    it('gets audit stats', async () => {
      mockResponse({ total: 100, byRisk: { LOW: 50, HIGH: 50 }, avgScore: 35 });
      const result = await api.audit.stats();
      expect(result.total).toBe(100);
    });
  });

  describe('diagnostics', () => {
    it('runs index redundancy analysis', async () => {
      mockResponse({ totalIssues: 2, redundant: [], duplicates: [] });
      const result = await api.diagnostics.indexRedundancy('conn1', 'demo');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/diagnostics/index-redundancy/conn1/demo',
        expect.anything(),
      );
      expect(result.totalIssues).toBe(2);
    });

    it('parses slow log', async () => {
      mockResponse({ stats: { totalQueries: 5 }, fingerprints: [] });
      const result = await api.diagnostics.parseSlowLog('# Time: ...');
      expect(global.fetch).toHaveBeenCalledWith('/api/diagnostics/slow-log', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.stats.totalQueries).toBe(5);
    });

    it('scans for PII', async () => {
      mockResponse({ hasPII: true, fields: ['email'] });
      const result = await api.diagnostics.piiScan('SELECT email FROM users');
      expect(result.hasPII).toBe(true);
    });

    it('gets execution plan', async () => {
      mockResponse({ plan: [{ type: 'ALL', table: 'users' }] });
      const result = await api.diagnostics.plan('conn1', 'SELECT * FROM users');
      expect(global.fetch).toHaveBeenCalledWith('/api/diagnostics/plan', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.plan).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response with error message', async () => {
      mockResponse({ error: 'Connection refused' }, false, 500);
      await expect(api.connections.list()).rejects.toThrow('Connection refused');
    });

    it('throws statusText when json parse fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => { throw new Error('parse error'); },
      } as unknown as Response);
      await expect(api.connections.list()).rejects.toThrow('Service Unavailable');
    });

    it('throws generic HTTP error when no message available', async () => {
      mockResponse({}, false, 403);
      await expect(api.connections.list()).rejects.toThrow('HTTP 403');
    });
  });
});
