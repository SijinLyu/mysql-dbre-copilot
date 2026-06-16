import { Router, Request, Response } from 'express';
import { SchemaCache, SchemaIntrospector } from '../../schema/index.js';
import { getConnectionPool } from './connections.js';
import {
  IndexRedundancyDetector,
  SlowQueryLogParser,
  QueryPlanDiagnostics,
} from '../../diagnostics/index.js';
import { PiiDetector } from '../../safety/pii-detector.js';

export function createDiagnosticsRouter(schemaCache: SchemaCache): Router {
  const router = Router();
  const redundancyDetector = new IndexRedundancyDetector();
  const slowLogParser = new SlowQueryLogParser();
  const planDiagnostics = new QueryPlanDiagnostics();
  const piiDetector = new PiiDetector();

  // GET /api/diagnostics/index-redundancy/:connectionId/:database
  router.get('/index-redundancy/:connectionId/:database', async (req: Request, res: Response) => {
    try {
      const { connectionId, database } = req.params;
      let schema = schemaCache.get(connectionId, database);

      if (!schema) {
        const pool = getConnectionPool(connectionId);
        if (!pool) {
          return res.status(404).json({ error: `Connection '${connectionId}' not found` });
        }
        const introspector = new SchemaIntrospector(pool);
        schema = await introspector.introspect(database);
        schemaCache.set(connectionId, database, schema);
      }

      const report = redundancyDetector.analyzeAll(schema.tables);
      const totalIssues =
        report.redundant.length + report.duplicates.length + report.potentiallyUnused.length;

      res.json({
        database,
        tableCount: schema.tables.length,
        totalIssues,
        ...report,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/diagnostics/slow-log  body: { content: string }
  router.post('/slow-log', (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      if (typeof content !== 'string' || content.length === 0) {
        return res.status(400).json({ error: 'Body must include "content" (slow log text)' });
      }
      if (content.length > 5_000_000) {
        return res.status(413).json({ error: 'Slow log too large (max 5MB)' });
      }

      const entries = slowLogParser.parse(content);
      const stats = slowLogParser.computeStats(entries);
      const groupsMap = slowLogParser.groupByFingerprint(entries);
      const fingerprints = Array.from(groupsMap.values()).sort(
        (a, b) => b.totalTimeMs - a.totalTimeMs
      );

      res.json({ entryCount: entries.length, stats, fingerprints });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/diagnostics/pii-scan  body: { sql: string }
  router.post('/pii-scan', (req: Request, res: Response) => {
    try {
      const { sql } = req.body;
      if (typeof sql !== 'string') {
        return res.status(400).json({ error: 'Body must include "sql"' });
      }

      const matches = piiDetector.scan(sql);
      const grouped = piiDetector.groupByCategory(matches);
      const severity = piiDetector.getHighestSeverity(matches);
      const summary = piiDetector.summarize(matches);

      res.json({
        matchCount: matches.length,
        severity,
        summary,
        matches,
        groupedByCategory: grouped,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/diagnostics/plan  body: { connectionId, sql }
  router.post('/plan', async (req: Request, res: Response) => {
    try {
      const { connectionId, sql } = req.body;
      if (!connectionId || typeof sql !== 'string') {
        return res.status(400).json({ error: 'Body must include "connectionId" and "sql"' });
      }

      const pool = getConnectionPool(connectionId);
      if (!pool) {
        return res.status(404).json({ error: `Connection '${connectionId}' not found` });
      }

      const explainSql = `EXPLAIN ${sql.replace(/;\s*$/, '')}`;
      const [rows] = await pool.query(explainSql);

      const explainRows = (rows as any[]) || [];
      const analysis = {
        rows: explainRows,
        hasFullTableScan: explainRows.some((r: any) => r.type === 'ALL'),
        hasFilesort: explainRows.some((r: any) => r.Extra && /Using filesort/i.test(r.Extra)),
        hasTempTable: explainRows.some((r: any) => r.Extra && /Using temporary/i.test(r.Extra)),
        estimatedRows: explainRows.reduce((sum: number, r: any) => sum + (r.rows ?? 0), 0),
        warnings: [],
      };

      const report = planDiagnostics.diagnose(analysis as any);
      res.json(report);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
