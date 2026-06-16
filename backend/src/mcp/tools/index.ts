import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DatabaseConnectionManager } from "../database.js";
import { connectionTools, handleConnectionTool } from "./connection.js";
import { queryTools, handleQueryTool } from "./query.js";

export const allTools: Tool[] = [
  ...connectionTools,
  ...queryTools,
];

export async function handleToolCall(
  name: string,
  args: any,
  dbManager: DatabaseConnectionManager
): Promise<any> {
  if (["add_connection", "list_connections", "select_database", "remove_connection"].includes(name)) {
    return handleConnectionTool(name, args, dbManager);
  }

  if (["execute_query", "show_tables", "describe_table", "show_databases"].includes(name)) {
    return handleQueryTool(name, args, dbManager);
  }

  throw new Error(`Unknown tool: ${name}`);
}
