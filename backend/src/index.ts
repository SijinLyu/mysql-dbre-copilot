#!/usr/bin/env node

import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`MySQL DBRE Copilot backend started`, {
    port: config.port,
    env: config.nodeEnv,
    llmProvider: config.llm.provider,
  });
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   MySQL DBRE Copilot v1.0.0                          ║
║                                                       ║
║   API:     http://localhost:${config.port}/api            ║
║   Health:  http://localhost:${config.port}/health         ║
║   MCP:     http://localhost:${config.port}/mcp            ║
║                                                       ║
║   LLM Provider: ${config.llm.provider.padEnd(10)}                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  process.exit(0);
});
