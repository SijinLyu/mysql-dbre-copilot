import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import { config } from './config.js';
import { createApiRouter, errorHandler, requestLogger } from './api/index.js';
import { ChatService } from './chat/index.js';
import { SchemaCache } from './schema/index.js';
import { getLLMProvider } from './llm/index.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id',
      'X-MySQL-Host', 'X-MySQL-Port', 'X-MySQL-User', 'X-MySQL-Password', 'X-MySQL-Database'],
    exposedHeaders: ['Content-Type', 'Mcp-Session-Id'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      llmProvider: config.llm.provider,
      timestamp: new Date().toISOString(),
    });
  });

  // Initialize services
  const schemaCache = new SchemaCache();

  // Create default MySQL pool
  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  // Create LLM provider
  const llmProvider = getLLMProvider(config.llm);

  // Create chat service
  const chatService = new ChatService(llmProvider, pool, schemaCache);

  // Mount API routes
  app.use('/api', createApiRouter(chatService, schemaCache));

  // Error handler
  app.use(errorHandler);

  return app;
}
