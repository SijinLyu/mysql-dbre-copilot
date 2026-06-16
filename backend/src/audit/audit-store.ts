import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import { AuditEntry, AuditQueryOptions } from './types.js';
import { logger } from '../utils/logger.js';

export class AuditStore {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        database_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        user_message TEXT NOT NULL,
        generated_sql TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        executed INTEGER NOT NULL DEFAULT 0,
        execution_time_ms INTEGER,
        row_count INTEGER,
        error TEXT
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_session ON audit_log(session_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_risk_level ON audit_log(risk_level)`);

    this.save();
    logger.info('Audit store initialized');
  }

  private save(): void {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  insert(entry: AuditEntry): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO audit_log (id, session_id, connection_id, database_name, timestamp,
        user_message, generated_sql, risk_level, risk_score, executed,
        execution_time_ms, row_count, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.sessionId,
        entry.connectionId,
        entry.database,
        entry.timestamp,
        entry.userMessage,
        entry.generatedSql,
        entry.riskLevel,
        entry.riskScore,
        entry.executed ? 1 : 0,
        entry.executionTimeMs,
        entry.rowCount,
        entry.error,
      ]
    );
    this.save();
  }

  query(options: AuditQueryOptions = {}): AuditEntry[] {
    if (!this.db) return [];

    let sql = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];

    if (options.sessionId) {
      sql += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    if (options.riskLevel) {
      sql += ' AND risk_level = ?';
      params.push(options.riskLevel);
    }

    if (options.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(options.startDate);
    }

    if (options.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    sql += ' ORDER BY timestamp DESC';
    sql += ` LIMIT ${options.limit || 50} OFFSET ${options.offset || 0}`;

    const stmt = this.db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const results: AuditEntry[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        sessionId: row.session_id as string,
        connectionId: row.connection_id as string,
        database: row.database_name as string,
        timestamp: row.timestamp as string,
        userMessage: row.user_message as string,
        generatedSql: row.generated_sql as string,
        riskLevel: row.risk_level as any,
        riskScore: row.risk_score as number,
        executed: row.executed === 1,
        executionTimeMs: row.execution_time_ms as number | null,
        rowCount: row.row_count as number | null,
        error: row.error as string | null,
      });
    }
    stmt.free();

    return results;
  }

  getStats(): { total: number; byRisk: Record<string, number>; avgScore: number } {
    if (!this.db) return { total: 0, byRisk: {}, avgScore: 0 };

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM audit_log');
    totalStmt.step();
    const total = (totalStmt.getAsObject().count as number) || 0;
    totalStmt.free();

    const byRisk: Record<string, number> = {};
    const riskStmt = this.db.prepare('SELECT risk_level, COUNT(*) as count FROM audit_log GROUP BY risk_level');
    while (riskStmt.step()) {
      const row = riskStmt.getAsObject();
      byRisk[row.risk_level as string] = row.count as number;
    }
    riskStmt.free();

    const avgStmt = this.db.prepare('SELECT AVG(risk_score) as avg FROM audit_log');
    avgStmt.step();
    const avgScore = Math.round((avgStmt.getAsObject().avg as number) || 0);
    avgStmt.free();

    return { total, byRisk, avgScore };
  }

  close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}
