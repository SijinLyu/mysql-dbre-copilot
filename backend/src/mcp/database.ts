import mysql, { Pool } from "mysql2/promise";

export interface DatabaseConfig {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface ConnectionInfo {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  isActive: boolean;
  connectedAt: Date;
}

export class DatabaseConnectionManager {
  private connections = new Map<string, Pool>();
  private configs = new Map<string, ConnectionInfo>();
  private activeConnectionId: string | null = null;

  async addConnection(config: DatabaseConfig): Promise<void> {
    if (this.connections.has(config.id)) {
      await this.removeConnection(config.id);
    }

    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      charset: "utf8mb4",
      timezone: "+08:00",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 10000,
      maxIdle: 10,
      idleTimeout: 60000,
    });

    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    this.connections.set(config.id, pool);
    this.configs.set(config.id, {
      ...config,
      isActive: false,
      connectedAt: new Date(),
    });

    if (this.activeConnectionId === null) {
      this.activeConnectionId = config.id;
    }

    console.log(`Connection added: ${config.id} (${config.host}:${config.port}/${config.database})`);
  }

  async removeConnection(id: string): Promise<void> {
    const pool = this.connections.get(id);
    if (!pool) {
      throw new Error(`Connection '${id}' does not exist`);
    }

    await pool.end();
    this.connections.delete(id);
    this.configs.delete(id);

    if (this.activeConnectionId === id) {
      const remaining = Array.from(this.connections.keys());
      this.activeConnectionId = remaining.length > 0 ? remaining[0] : null;
    }

    console.log(`Connection removed: ${id}`);
  }

  selectDatabase(id: string): void {
    if (!this.connections.has(id)) {
      throw new Error(`Connection '${id}' does not exist`);
    }
    this.activeConnectionId = id;
    console.log(`Active database selected: ${id}`);
  }

  getActiveConnection(): Pool {
    if (!this.activeConnectionId || !this.connections.has(this.activeConnectionId)) {
      throw new Error("No active database connection");
    }
    return this.connections.get(this.activeConnectionId)!;
  }

  getActiveConnectionId(): string | null {
    return this.activeConnectionId;
  }

  getConnection(id: string): Pool | undefined {
    return this.connections.get(id);
  }

  listConnections(): ConnectionInfo[] {
    return Array.from(this.configs.values()).map(config => ({
      ...config,
      isActive: config.id === this.activeConnectionId,
    }));
  }

  async executeQuery(sql: string, connectionId?: string): Promise<any> {
    const pool = connectionId
      ? this.getConnection(connectionId)
      : this.getActiveConnection();

    if (!pool) {
      throw new Error(connectionId ? `Connection '${connectionId}' does not exist` : "No active connection");
    }

    const [results] = await pool.query(sql);
    return results;
  }

  async disconnectAll(): Promise<void> {
    for (const [id, pool] of this.connections.entries()) {
      try {
        await pool.end();
        console.log(`Connection pool closed: ${id}`);
      } catch (error) {
        console.error(`Failed to close connection ${id}:`, error);
      }
    }
    this.connections.clear();
    this.configs.clear();
    this.activeConnectionId = null;
  }
}
