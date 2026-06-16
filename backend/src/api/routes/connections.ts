import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { connectionSchema } from '../validators/chat.js';
import { logger } from '../../utils/logger.js';

interface ManagedConnection {
  id: string;
  host: string;
  port: number;
  user: string;
  database: string;
  pool: mysql.Pool;
  connectedAt: Date;
}

const connections = new Map<string, ManagedConnection>();

export function createConnectionsRouter(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const list = Array.from(connections.values()).map(conn => ({
      id: conn.id,
      host: conn.host,
      port: conn.port,
      user: conn.user,
      database: conn.database,
      connectedAt: conn.connectedAt,
    }));
    res.json({ connections: list });
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const input = connectionSchema.parse(req.body);

      // Test connection
      const pool = mysql.createPool({
        host: input.host,
        port: input.port,
        user: input.user,
        password: input.password,
        database: input.database,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();

      connections.set(input.id, {
        id: input.id,
        host: input.host,
        port: input.port,
        user: input.user,
        database: input.database,
        pool,
        connectedAt: new Date(),
      });

      logger.info('Connection added', { id: input.id, host: input.host });
      res.status(201).json({ success: true, id: input.id });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation error', details: err.message });
      }
      logger.error('Connection failed', { error: err.message });
      res.status(500).json({ error: `Connection failed: ${err.message}` });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const conn = connections.get(id);
      if (!conn) {
        return res.status(404).json({ error: `Connection '${id}' not found` });
      }

      await conn.pool.end();
      connections.delete(id);
      logger.info('Connection removed', { id });
      res.json({ success: true });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

export function getConnectionPool(id: string): mysql.Pool | undefined {
  return connections.get(id)?.pool;
}

export function getConnections(): Map<string, ManagedConnection> {
  return connections;
}
