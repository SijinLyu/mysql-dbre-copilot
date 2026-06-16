import { Router } from 'express';
import { ChatService } from '../../chat/index.js';
import { SchemaCache } from '../../schema/index.js';
import { AuditLogger } from '../../audit/index.js';
import { createChatRouter } from './chat.js';
import { createConnectionsRouter } from './connections.js';
import { createSchemaRouter } from './schema.js';
import { createAuditRouter } from './audit.js';
import { createDiagnosticsRouter } from './diagnostics.js';

export function createApiRouter(
  chatService: ChatService,
  schemaCache: SchemaCache,
  auditLogger: AuditLogger
): Router {
  const router = Router();

  router.use('/chat', createChatRouter(chatService));
  router.use('/connections', createConnectionsRouter());
  router.use('/schema', createSchemaRouter(schemaCache));
  router.use('/audit', createAuditRouter(auditLogger));
  router.use('/diagnostics', createDiagnosticsRouter(schemaCache));

  return router;
}
