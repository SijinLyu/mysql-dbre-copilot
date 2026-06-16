import { describe, it, expect } from 'vitest';
import { escapeField, entriesToCsv } from '../services/csvExport';

describe('csvExport', () => {
  describe('escapeField', () => {
    it('returns plain values unchanged', () => {
      expect(escapeField('hello')).toBe('hello');
      expect(escapeField('123')).toBe('123');
    });

    it('wraps values with commas in quotes', () => {
      expect(escapeField('a,b')).toBe('"a,b"');
    });

    it('wraps values with double quotes and escapes them', () => {
      expect(escapeField('say "hi"')).toBe('"say ""hi"""');
    });

    it('wraps values with newlines', () => {
      expect(escapeField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('handles combined special characters', () => {
      expect(escapeField('a,b"c\nd')).toBe('"a,b""c\nd"');
    });

    it('returns empty string unchanged', () => {
      expect(escapeField('')).toBe('');
    });
  });

  describe('entriesToCsv', () => {
    const sampleEntries = [
      {
        id: 'a1',
        sessionId: 's1',
        connectionId: 'c1',
        database: 'demo',
        timestamp: '2026-06-15T10:00:00Z',
        userMessage: 'Show users',
        generatedSql: 'SELECT * FROM users',
        riskLevel: 'LOW',
        riskScore: 10,
        executed: true,
        executionTimeMs: 45,
        rowCount: 100,
        error: null,
      },
      {
        id: 'a2',
        sessionId: 's1',
        connectionId: 'c1',
        database: 'demo',
        timestamp: '2026-06-15T11:00:00Z',
        userMessage: 'Drop table',
        generatedSql: 'DROP TABLE users',
        riskLevel: 'CRITICAL',
        riskScore: 95,
        executed: false,
        executionTimeMs: null,
        rowCount: null,
        error: null,
      },
    ];

    it('generates CSV with header row', () => {
      const csv = entriesToCsv(sampleEntries);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('Timestamp,Risk Level,Score,User Message,Generated SQL,Executed,Execution Time (ms),Row Count,Error');
    });

    it('generates correct number of rows', () => {
      const csv = entriesToCsv(sampleEntries);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
    });

    it('formats executed entry correctly', () => {
      const csv = entriesToCsv(sampleEntries);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('2026-06-15T10:00:00Z');
      expect(lines[1]).toContain('LOW');
      expect(lines[1]).toContain('10');
      expect(lines[1]).toContain('yes');
      expect(lines[1]).toContain('45');
      expect(lines[1]).toContain('100');
    });

    it('formats non-executed entry correctly', () => {
      const csv = entriesToCsv(sampleEntries);
      const lines = csv.split('\n');
      expect(lines[2]).toContain('CRITICAL');
      expect(lines[2]).toContain('no');
    });

    it('handles empty entries array', () => {
      const csv = entriesToCsv([]);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Timestamp');
    });

    it('escapes SQL with special characters', () => {
      const entries = [{
        id: 'x',
        sessionId: 's',
        connectionId: 'c',
        database: 'db',
        timestamp: '2026-01-01T00:00:00Z',
        userMessage: 'query with, comma',
        generatedSql: 'SELECT "name" FROM users',
        riskLevel: 'LOW',
        riskScore: 5,
        executed: false,
        executionTimeMs: null,
        rowCount: null,
        error: null,
      }];
      const csv = entriesToCsv(entries);
      expect(csv).toContain('"query with, comma"');
      expect(csv).toContain('"SELECT ""name"" FROM users"');
    });

    it('handles entries with errors', () => {
      const entries = [{
        id: 'x',
        sessionId: 's',
        connectionId: 'c',
        database: 'db',
        timestamp: '2026-01-01T00:00:00Z',
        userMessage: 'bad query',
        generatedSql: 'INVALID SQL',
        riskLevel: 'HIGH',
        riskScore: 80,
        executed: true,
        executionTimeMs: 0,
        rowCount: 0,
        error: 'Syntax error near "INVALID"',
      }];
      const csv = entriesToCsv(entries);
      expect(csv).toContain('Syntax error near');
    });
  });
});
