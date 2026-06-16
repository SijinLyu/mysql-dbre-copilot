export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type SqlType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'OTHER';

export interface SafetyCheck {
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface ExplainRow {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  Extra: string;
}

export interface ExplainAnalysis {
  rows: ExplainRow[];
  hasFullTableScan: boolean;
  hasFilesort: boolean;
  hasTempTable: boolean;
  estimatedRows: number;
  warnings: string[];
}

export interface SafetyReport {
  riskLevel: RiskLevel;
  riskScore: number;
  sqlType: SqlType;
  checks: SafetyCheck[];
  explainAnalysis?: ExplainAnalysis;
  recommendation: 'execute' | 'warn' | 'reject';
  suggestions: string[];
  executionAllowed: boolean;
}
