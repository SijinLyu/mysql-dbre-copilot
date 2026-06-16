import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "../database.js";

export const connectionTools: Tool[] = [
  {
    name: "add_connection",
    description: "Add a MySQL database connection.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Unique connection id, for example prod, test, or dev.",
        },
        host: {
          type: "string",
          description: "Database host.",
        },
        port: {
          type: "number",
          description: "Database port.",
          default: 3306,
        },
        user: {
          type: "string",
          description: "Database username.",
        },
        password: {
          type: "string",
          description: "Database password.",
        },
        database: {
          type: "string",
          description: "Database name.",
        },
      },
      required: ["id", "host", "user", "password", "database"],
    },
  },
  {
    name: "list_connections",
    description: "List all configured database connections and show the active connection id.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "select_database",
    description: "Select the active database connection used by later SQL tools.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Connection id to select.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "remove_connection",
    description: "Remove a database connection.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Connection id to remove.",
        },
      },
      required: ["id"],
    },
  },
];

export async function handleConnectionTool(
  name: string,
  args: any,
  dbManager: DatabaseConnectionManager
): Promise<any> {
  switch (name) {
    case "add_connection": {
      const { id, host, port = 3306, user, password, database } = args;

      await dbManager.addConnection({
        id,
        host,
        port,
        user,
        password,
        database,
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Database connection added\n` +
              `ID: ${id}\n` +
              `Host: ${host}:${port}\n` +
              `Database: ${database}\n` +
              `User: ${user}`,
          },
        ],
      };
    }

    case "list_connections": {
      const connections = dbManager.listConnections();

      if (connections.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No database connections are configured. Use add_connection to add one.",
            },
          ],
        };
      }

      let text = `Database connections (${connections.length})\n\n`;

      connections.forEach((conn, index) => {
        const marker = conn.isActive ? "*" : "-";
        text += `${marker} [${index + 1}] ${conn.id}\n`;
        text += `  ${conn.host}:${conn.port}/${conn.database}\n`;
        text += `  User: ${conn.user}\n`;
        if (conn.isActive) {
          text += `  Active connection\n`;
        }
        text += `\n`;
      });

      text += "Use select_database to switch the active connection.";

      return {
        content: [{ type: "text", text }],
      };
    }

    case "select_database": {
      const { id } = args;

      dbManager.selectDatabase(id);
      const connections = dbManager.listConnections();
      const selected = connections.find(c => c.id === id);

      return {
        content: [
          {
            type: "text",
            text:
              `Database selected\n` +
              `ID: ${id}\n` +
              `Database: ${selected?.database}\n` +
              `Host: ${selected?.host}:${selected?.port}\n\n` +
              `Later SQL tools will use this connection.`,
          },
        ],
      };
    }

    case "remove_connection": {
      const { id } = args;

      await dbManager.removeConnection(id);

      return {
        content: [
          {
            type: "text",
            text: `Connection removed: ${id}\nRemaining connections: ${dbManager.listConnections().length}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown connection tool: ${name}`);
  }
}
