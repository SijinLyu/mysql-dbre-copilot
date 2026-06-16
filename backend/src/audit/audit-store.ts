import Database from 'better-sqlite3';
import { AuditEntry, AuditQueryOptions } from './types.js';
import { logger } from '../utils/logger.js';

export class AuditStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
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
      );

      CREATE INDEX IF NOT EXISTS idx_session ON audit_log(session_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_risk_level ON audit_log(risk_level);
    `);
    logger.info('Audit store initialized');
  }

  insert(entry: AuditEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, session_id, connection_id, database_name, timestamp,
        user_message, generated_sql, risk_level, risk_score, executed,
        execution_time_ms, row_count, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
      entry.error
    );
  }

  query(options: AuditQueryOptions = {}): AuditEntry[] {
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
    sql += ` LIMIT ? OFFSET ?`;
    params.push(options.limit || 50);
    params.push(options.offset || 0);

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      connectionId: row.connection_id,
      database: row.database_name,
      timestamp: row.timestamp,
      userMessage: row.user_message,
      generatedSql: row.generated_sql,
      riskLevel: row.risk_level,
      riskScore: row.risk_score,
      executed: row.executed === 1,
      executionTimeMs: row.execution_time_ms,
      rowCount: row.row_count,
      error: row.error,
    }));
  }

  getStats(): { total: number; byRisk: Record<string, number>; avgScore: number } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM audit_log').get() as any).count;
    const byRiskRows = this.db.prepare(
      'SELECT risk_level, COUNT(*) as count FROM audit_log GROUP BY risk_level'
    ).all() as any[];
    const avgScore = (this.db.prepare(
      'SELECT AVG(risk_score) as avg FROM audit_log'
    ).get() as any).avg || 0;

    const byRisk: Record<string, number> = {};
    for (const row of byRiskRows) {
      byRisk[row.risk_level] = row.count;
    }

    return { total, byRisk, avgScore: Math.round(avgScore) };
  }

  close(): void {
    this.db.close();
  }
}
