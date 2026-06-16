import { Router } from 'express';
import { ChatService } from '../../chat/index.js';
import { SchemaCache } from '../../schema/index.js';
import { createChatRouter } from './chat.js';
import { createConnectionsRouter } from './connections.js';
import { createSchemaRouter } from './schema.js';

export function createApiRouter(chatService: ChatService, schemaCache: SchemaCache): Router {
  const router = Router();

  router.use('/chat', createChatRouter(chatService));
  router.use('/connections', createConnectionsRouter());
  router.use('/schema', createSchemaRouter(schemaCache));

  return router;
}
