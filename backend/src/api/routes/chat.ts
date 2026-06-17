import { Router, Request, Response } from 'express';
import { ChatService } from '../../chat/index.js';
import { AuditLogger } from '../../audit/index.js';
import { chatMessageSchema } from '../validators/chat.js';
import { logger } from '../../utils/logger.js';

export function createChatRouter(chatService: ChatService, auditLogger: AuditLogger): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const input = chatMessageSchema.parse(req.body);

      const response = await chatService.processMessage({
        sessionId: input.sessionId,
        connectionId: input.connectionId,
        message: input.message,
        database: input.database,
      });

      if (response.sql && response.safetyReport) {
        await auditLogger.logAsync({
          sessionId: input.sessionId,
          connectionId: input.connectionId,
          database: input.database,
          userMessage: input.message,
          generatedSql: response.sql,
          safetyReport: response.safetyReport,
          executed: response.safetyReport.executionAllowed && Array.isArray(response.results),
          executionTimeMs: response.executionTimeMs,
          rowCount: response.resultCount,
        });
      }

      res.json(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err.message });
      }
      logger.error('Chat endpoint error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/history/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const history = chatService.getHistory(sessionId);
      res.json({ sessionId, messages: history });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/history/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      chatService.clearHistory(sessionId);
      res.json({ success: true });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
