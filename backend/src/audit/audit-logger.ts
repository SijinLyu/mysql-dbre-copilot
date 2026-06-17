import { v4 as uuidv4 } from 'uuid';
import { AuditStore } from './audit-store.js';
import { AuditEntry } from './types.js';
import { SafetyReport } from '../safety/types.js';
import { logger } from '../utils/logger.js';

export class AuditLogger {
  private store: AuditStore;

  constructor(dbPath: string) {
    this.store = new AuditStore(dbPath);
  }

  log(params: {
    sessionId: string;
    connectionId: string;
    database: string;
    userMessage: string;
    generatedSql: string;
    safetyReport: SafetyReport;
    executed: boolean;
    executionTimeMs?: number;
    rowCount?: number;
    error?: string;
  }): void {
    this.insertEntry(params);
  }

  async logAsync(params: {
    sessionId: string;
    connectionId: string;
    database: string;
    userMessage: string;
    generatedSql: string;
    safetyReport: SafetyReport;
    executed: boolean;
    executionTimeMs?: number;
    rowCount?: number;
    error?: string;
  }): Promise<void> {
    await this.store.ensureReady();
    this.insertEntry(params);
  }

  async ready(): Promise<void> {
    await this.store.ensureReady();
  }

  private insertEntry(params: {
    sessionId: string;
    connectionId: string;
    database: string;
    userMessage: string;
    generatedSql: string;
    safetyReport: SafetyReport;
    executed: boolean;
    executionTimeMs?: number;
    rowCount?: number;
    error?: string;
  }): void {
    const entry: AuditEntry = {
      id: uuidv4(),
      sessionId: params.sessionId,
      connectionId: params.connectionId,
      database: params.database,
      timestamp: new Date().toISOString(),
      userMessage: params.userMessage,
      generatedSql: params.generatedSql,
      riskLevel: params.safetyReport.riskLevel,
      riskScore: params.safetyReport.riskScore,
      executed: params.executed,
      executionTimeMs: params.executionTimeMs ?? null,
      rowCount: params.rowCount ?? null,
      error: params.error ?? null,
    };

    try {
      this.store.insert(entry);
      logger.debug('Audit entry recorded', { id: entry.id, riskLevel: entry.riskLevel });
    } catch (err) {
      logger.error('Failed to write audit entry', { error: (err as Error).message });
    }
  }

  query(options?: any) {
    return this.store.query(options);
  }

  getStats() {
    return this.store.getStats();
  }

  close(): void {
    this.store.close();
  }
}
