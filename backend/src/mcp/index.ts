#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { DatabaseConnectionManager, DatabaseConfig } from "./database.js";
import { allTools, handleToolCall } from "./tools/index.js";

const SERVICE_NAME = "mysql-dbre-copilot-mcp";
const SERVICE_VERSION = "1.0.0";

interface Session {
  id: string;
  server: Server;
  transport: StreamableHTTPServerTransport;
  dbManager: DatabaseConnectionManager;
  createdAt: Date;
  lastActivity: Date;
}

const sessions = new Map<string, Session>();

function extractDatabaseConfigsFromHeaders(req: Request): DatabaseConfig[] {
  const configs: DatabaseConfig[] = [];

  const host = req.headers["x-mysql-host"] as string | undefined;
  const port = req.headers["x-mysql-port"] as string | undefined;
  const user = req.headers["x-mysql-user"] as string | undefined;
  const password = req.headers["x-mysql-password"] as string | undefined;
  const database = req.headers["x-mysql-database"] as string | undefined;

  if (host && user && password && database) {
    configs.push({
      id: "header_default",
      host: host.trim(),
      port: port ? parseInt(port, 10) : 3306,
      user: user.trim(),
      password: password.trim(),
      database: database.trim(),
    });
  }

  for (let i = 1; i <= 20; i++) {
    const hostN = req.headers[`x-mysql-host-${i}`] as string | undefined;
    const portN = req.headers[`x-mysql-port-${i}`] as string | undefined;
    const userN = req.headers[`x-mysql-user-${i}`] as string | undefined;
    const passwordN = req.headers[`x-mysql-password-${i}`] as string | undefined;
    const databaseN = req.headers[`x-mysql-database-${i}`] as string | undefined;

    if (!hostN) break;

    if (hostN && userN && passwordN && databaseN) {
      configs.push({
        id: `header_${i}`,
        host: hostN.trim(),
        port: portN ? parseInt(portN, 10) : 3306,
        user: userN.trim(),
        password: passwordN.trim(),
        database: databaseN.trim(),
      });
    }
  }

  return configs;
}

async function initializeDatabaseConnections(
  dbManager: DatabaseConnectionManager,
  configs: DatabaseConfig[]
): Promise<void> {
  if (configs.length === 0) return;

  console.log(`Detected ${configs.length} database header configuration(s). Initializing...`);

  for (const config of configs) {
    try {
      await dbManager.addConnection(config);
      console.log(`Header connection added: ${config.id}`);
    } catch (error) {
      console.error(`Header connection failed [${config.id}]:`, error);
    }
  }

  console.log(`Header initialization complete. Active connection count: ${dbManager.listConnections().length}`);
}

function createMCPServer(dbManager: DatabaseConnectionManager): Server {
  const server = new Server(
    {
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async (_request: any) => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      return await handleToolCall(name, args || {}, dbManager);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Tool execution failed [${name}]:`, err.message);

      return {
        content: [
          {
            type: "text",
            text: `Execution failed: ${err.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedHeaders = [
  "Content-Type",
  "Accept",
  "Authorization",
  "Mcp-Session-Id",
  "X-MySQL-Host",
  "X-MySQL-Port",
  "X-MySQL-User",
  "X-MySQL-Password",
  "X-MySQL-Database",
];

for (let i = 1; i <= 20; i++) {
  allowedHeaders.push(
    `X-MySQL-Host-${i}`,
    `X-MySQL-Port-${i}`,
    `X-MySQL-User-${i}`,
    `X-MySQL-Password-${i}`,
    `X-MySQL-Database-${i}`
  );
}

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders,
  exposedHeaders: ["Content-Type", "Mcp-Session-Id"],
}));

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    name: SERVICE_NAME,
    transport: "streamable-http",
    activeSessions: sessions.size,
    version: SERVICE_VERSION,
  });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;
  const body = req.body;

  if (!body || !body.method) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid request" },
      id: null,
    });
  }

  let session: Session | undefined;
  const isInit = body.method === "initialize";

  if (sessionIdHeader && sessions.has(sessionIdHeader)) {
    session = sessions.get(sessionIdHeader)!;
    session.lastActivity = new Date();
  } else if (!sessionIdHeader && isInit) {
    const dbManager = new DatabaseConnectionManager();
    const dbConfigs = extractDatabaseConfigsFromHeaders(req);
    await initializeDatabaseConnections(dbManager, dbConfigs);

    const server = createMCPServer(dbManager);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        const newSession: Session = {
          id: sessionId,
          server,
          transport,
          dbManager,
          createdAt: new Date(),
          lastActivity: new Date(),
        };
        sessions.set(sessionId, newSession);
        console.log(`MCP session created: ${sessionId}`);
        console.log(`Database connection count: ${dbManager.listConnections().length}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId && sessions.has(transport.sessionId)) {
        const sessionId = transport.sessionId;
        const existingSession = sessions.get(sessionId)!;

        existingSession.dbManager.disconnectAll().catch(err => {
          console.error("Failed to disconnect database connections during transport close:", err);
        });

        sessions.delete(sessionId);
        console.log(`MCP session closed: ${sessionId}`);
      }
    };

    await server.connect(transport);

    try {
      await transport.handleRequest(req, res, body);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Initialize request failed:", err.message);
      if (!res.headersSent) {
        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: err.message },
          id: body.id || null,
        });
      }
    }
    return;
  } else {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found" },
      id: body.id || null,
    });
  }

  try {
    await session.transport.handleRequest(req, res, body);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("MCP request failed:", err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: err.message },
        id: body.id || null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionIdHeader || !sessions.has(sessionIdHeader)) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found or invalid" },
      id: null,
    });
  }

  const session = sessions.get(sessionIdHeader)!;
  session.lastActivity = new Date();

  try {
    await session.transport.handleRequest(req, res);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("MCP stream request failed:", err.message);
    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: err.message },
        id: null,
      });
    }
  }
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionIdHeader || !sessions.has(sessionIdHeader)) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found" },
      id: null,
    });
  }

  const session = sessions.get(sessionIdHeader)!;

  try {
    await session.dbManager.disconnectAll();
    await session.transport.close();
    sessions.delete(sessionIdHeader);

    console.log(`MCP session deleted: ${sessionIdHeader}`);

    return res.status(200).json({
      jsonrpc: "2.0",
      result: { success: true },
      id: null,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to delete MCP session:", err.message);
    return res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: err.message },
      id: null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`
============================================================
  MySQL DBRE Copilot MCP Server v${SERVICE_VERSION} started

  Service name:  ${SERVICE_NAME}
  MCP endpoint:  http://localhost:${PORT}/mcp
  Health check:  http://localhost:${PORT}/health

  Features:
    - Header-based connection bootstrap
    - Dynamic connection management
    - Multiple database connections
    - SQL execution tools
    - Connection pooling
============================================================
  `);
});

const shutdown = async () => {
  console.log("\nShutting down MCP server...");

  for (const [sessionId, session] of sessions.entries()) {
    try {
      await session.dbManager.disconnectAll();
      console.log(`Session disconnected: ${sessionId}`);
    } catch (error) {
      console.error(`Failed to disconnect session ${sessionId}:`, error);
    }
  }

  console.log("MCP server stopped");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
