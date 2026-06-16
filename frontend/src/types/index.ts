export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: Record<string, unknown>[];
  resultCount?: number;
  executionTimeMs?: number;
  chartRecommendation?: ChartRecommendation;
  safetyReport?: SafetyReport;
  followUpSuggestions?: string[];
  timestamp: string;
}

export interface ChartRecommendation {
  chartType: 'bar' | 'line' | 'pie' | 'table';
  xField: string;
  yField: string;
  reason: string;
}

export interface SafetyReport {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  sqlType: string;
  checks: SafetyCheck[];
  explainAnalysis?: ExplainAnalysis;
  recommendation: 'execute' | 'warn' | 'reject';
  suggestions: string[];
  executionAllowed: boolean;
}

export interface SafetyCheck {
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface ExplainAnalysis {
  rows: ExplainRow[];
  hasFullTableScan: boolean;
  hasFilesort: boolean;
  hasTempTable: boolean;
  estimatedRows: number;
  warnings: string[];
}

export interface ExplainRow {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys: string | null;
  key: string | null;
  rows: number;
  Extra: string;
}

export interface Connection {
  id: string;
  host: string;
  port: number;
  user: string;
  database: string;
  connectedAt?: string;
}

export interface SchemaInfo {
  database: string;
  tables: TableMeta[];
}

export interface TableMeta {
  name: string;
  columns: { name: string; type: string; isPrimaryKey: boolean }[];
  rowEstimate: number;
}

export interface Favorite {
  id: string;
  name: string;
  sql: string;
  description?: string;
  connectionId: string;
  database: string;
  createdAt: string;
}
