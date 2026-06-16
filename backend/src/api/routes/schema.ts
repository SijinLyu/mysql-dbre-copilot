import { Router, Request, Response } from 'express';
import { SchemaIntrospector, SchemaCache } from '../../schema/index.js';
import { getConnectionPool } from './connections.js';
import { logger } from '../../utils/logger.js';

export function createSchemaRouter(schemaCache: SchemaCache): Router {
  const router = Router();

  router.get('/:connectionId', async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.params;
      const database = req.query.database as string;

      if (!database) {
        return res.status(400).json({ error: 'database query parameter is required' });
      }

      const pool = getConnectionPool(connectionId);
      if (!pool) {
        return res.status(404).json({ error: `Connection '${connectionId}' not found` });
      }

      // Check cache first
      let schema = schemaCache.get(connectionId, database);
      if (!schema) {
        const introspector = new SchemaIntrospector(pool);
        schema = await introspector.introspect(database);
        schemaCache.set(connectionId, database, schema);
      }

      res.json(schema);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Schema introspection failed', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:connectionId/cache', (req: Request, res: Response) => {
    const { connectionId } = req.params;
    const database = req.query.database as string;
    schemaCache.invalidate(connectionId, database);
    res.json({ success: true });
  });

  return router;
}
