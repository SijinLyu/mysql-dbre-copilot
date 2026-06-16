import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "../database.js";

export const queryTools: Tool[] = [
  {
    name: "execute_query",
    description: "Execute a SQL statement on the active MySQL connection. A connection_id is optional.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "SQL statement to execute.",
        },
        connection_id: {
          type: "string",
          description: "Optional connection id. Leave empty to use the active connection.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "show_tables",
    description: "Show all tables in the active database connection.",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: {
          type: "string",
          description: "Optional connection id. Leave empty to use the active connection.",
        },
      },
      required: [],
    },
  },
  {
    name: "describe_table",
    description: "Show table columns and a small sample of rows.",
    inputSchema: {
      type: "object",
      properties: {
        table_name: {
          type: "string",
          description: "Table name.",
        },
        connection_id: {
          type: "string",
          description: "Optional connection id. Leave empty to use the active connection.",
        },
      },
      required: ["table_name"],
    },
  },
  {
    name: "show_databases",
    description: "Show all accessible databases for the active connection.",
    inputSchema: {
      type: "object",
      properties: {
        connection_id: {
          type: "string",
          description: "Optional connection id. Leave empty to use the active connection.",
        },
      },
      required: [],
    },
  },
];

function normalizeConnectionId(
  connectionId: string | undefined,
  dbManager: DatabaseConnectionManager
): string | undefined {
  if (!connectionId || connectionId.trim() === "") {
    return undefined;
  }

  const trimmed = connectionId.trim();
  const invalidValues = ["default", "active", "current", "auto", "none", "null", "undefined"];

  if (invalidValues.includes(trimmed.toLowerCase())) {
    return undefined;
  }

  const exists = dbManager.listConnections().some(conn => conn.id === trimmed);
  if (!exists) {
    console.log(`Connection id "${trimmed}" does not exist; using active connection`);
    return undefined;
  }

  return trimmed;
}

export async function handleQueryTool(
  name: string,
  args: any,
  dbManager: DatabaseConnectionManager
): Promise<any> {
  const connectionId = normalizeConnectionId(args.connection_id, dbManager);

  switch (name) {
    case "execute_query": {
      const { query } = args;
      const results = await dbManager.executeQuery(query, connectionId);

      let text = "";
      if (Array.isArray(results)) {
        if (results.length === 0) {
          text = "Query succeeded, but no rows were returned.";
        } else {
          text = `Query succeeded. Returned ${results.length} rows.\n\n`;
          text += "```json\n";
          text += JSON.stringify(results, null, 2);
          text += "\n```";
        }
      } else if (results.affectedRows !== undefined) {
        text = `Statement succeeded\n`;
        text += `Affected rows: ${results.affectedRows}\n`;
        if (results.insertId) {
          text += `Insert id: ${results.insertId}\n`;
        }
      } else {
        text = "Statement succeeded";
      }

      return {
        content: [{ type: "text", text }],
      };
    }

    case "show_tables": {
      const results = await dbManager.executeQuery("SHOW TABLES", connectionId);

      if (!Array.isArray(results) || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No tables found in the database.",
            },
          ],
        };
      }

      const tableKey = Object.keys(results[0])[0];
      const tables = results.map((row: any) => row[tableKey]);

      let text = `Tables (${tables.length})\n\n`;
      tables.forEach((table: string, index: number) => {
        text += `${index + 1}. ${table}\n`;
      });

      return {
        content: [{ type: "text", text }],
      };
    }

    case "describe_table": {
      const { table_name } = args;
      const structure = await dbManager.executeQuery(`DESCRIBE ${table_name}`, connectionId);
      const sampleData = await dbManager.executeQuery(`SELECT * FROM ${table_name} LIMIT 3`, connectionId);

      let text = `Table structure: ${table_name}\n\n`;
      text += "**Columns:**\n```\n";

      if (Array.isArray(structure)) {
        structure.forEach((field: any) => {
          text += `${field.Field}\n`;
          text += `  Type: ${field.Type}\n`;
          text += `  Null: ${field.Null}\n`;
          text += `  Key: ${field.Key || "-"}\n`;
          text += `  Default: ${field.Default !== null ? field.Default : "NULL"}\n`;
          text += `  Extra: ${field.Extra || "-"}\n\n`;
        });
      }
      text += "```\n\n";

      if (Array.isArray(sampleData) && sampleData.length > 0) {
        text += "**Sample rows (first 3):**\n";
        text += "```json\n";
        text += JSON.stringify(sampleData, null, 2);
        text += "\n```";
      } else {
        text += "**Sample rows:** no data.";
      }

      return {
        content: [{ type: "text", text }],
      };
    }

    case "show_databases": {
      const results = await dbManager.executeQuery("SHOW DATABASES", connectionId);

      if (!Array.isArray(results) || results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No accessible databases found.",
            },
          ],
        };
      }

      const databases = results.map((row: any) => row.Database);

      let text = `Accessible databases (${databases.length})\n\n`;
      databases.forEach((db: string, index: number) => {
        text += `${index + 1}. ${db}\n`;
      });

      return {
        content: [{ type: "text", text }],
      };
    }

    default:
      throw new Error(`Unknown query tool: ${name}`);
  }
}
