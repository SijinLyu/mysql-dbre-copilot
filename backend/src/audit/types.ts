import { RiskLevel } from '../safety/types.js';

export interface AuditEntry {
  id: string;
  sessionId: string;
  connectionId: string;
  database: string;
  timestamp: string;
  userMessage: string;
  generatedSql: string;
  riskLevel: RiskLevel;
  riskScore: number;
  executed: boolean;
  executionTimeMs: number | null;
  rowCount: number | null;
  error: string | null;
}

export interface AuditQueryOptions {
  sessionId?: string;
  riskLevel?: RiskLevel;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
