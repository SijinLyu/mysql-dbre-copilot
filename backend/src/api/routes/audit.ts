import { Router, Request, Response } from 'express';
import { AuditLogger } from '../../audit/index.js';

export function createAuditRouter(auditLogger: AuditLogger): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      await auditLogger.ready();
      const { sessionId, riskLevel, startDate, endDate, limit, offset } = req.query;

      const entries = auditLogger.query({
        sessionId: sessionId as string,
        riskLevel: riskLevel as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      res.json({ entries, count: entries.length });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      await auditLogger.ready();
      const stats = auditLogger.getStats();
      res.json(stats);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
