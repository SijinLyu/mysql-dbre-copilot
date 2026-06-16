export interface AuditEntry {
  id: string;
  sessionId: string;
  connectionId: string;
  database: string;
  timestamp: string;
  userMessage: string;
  generatedSql: string;
  riskLevel: string;
  riskScore: number;
  executed: boolean;
  executionTimeMs: number | null;
  rowCount: number | null;
  error: string | null;
}

const CSV_HEADERS = [
  'Timestamp',
  'Risk Level',
  'Score',
  'User Message',
  'Generated SQL',
  'Executed',
  'Execution Time (ms)',
  'Row Count',
  'Error',
];

export function escapeField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function entriesToCsv(entries: AuditEntry[]): string {
  const rows = entries.map(e => [
    e.timestamp,
    e.riskLevel,
    String(e.riskScore),
    escapeField(e.userMessage),
    escapeField(e.generatedSql),
    e.executed ? 'yes' : 'no',
    e.executionTimeMs != null ? String(e.executionTimeMs) : '',
    e.rowCount != null ? String(e.rowCount) : '',
    e.error ? escapeField(e.error) : '',
  ]);
  return [CSV_HEADERS.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
