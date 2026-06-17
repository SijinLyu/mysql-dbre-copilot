import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface AuditEntry {
  id: string;
  sessionId: string;
  connectionId: string;
  database: string;
  timestamp: string;
  userMessage: string;
  generatedSql: string;
  riskLevel: RiskLevel | Uppercase<RiskLevel>;
  riskScore: number;
  executed: boolean;
  executionTimeMs: number | null;
  rowCount: number | null;
  error: string | null;
}

interface AuditStats {
  total: number;
  byRisk: Record<string, number>;
  avgScore: number;
}

const RISK_LEVELS: Array<{ value: RiskLevel; label: string; color: string }> = [
  { value: 'low', label: 'LOW', color: '#22c55e' },
  { value: 'medium', label: 'MEDIUM', color: '#eab308' },
  { value: 'high', label: 'HIGH', color: '#f97316' },
  { value: 'critical', label: 'CRITICAL', color: '#ef4444' },
];

const RISK_COLORS = Object.fromEntries(RISK_LEVELS.map(level => [level.value, level.color]));

const normalizeRisk = (risk: string): RiskLevel => risk.toLowerCase() as RiskLevel;
const formatRisk = (risk: string) => risk.toUpperCase();

export const AuditPanel: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (riskFilter) params.riskLevel = riskFilter;
      const [list, st] = await Promise.all([api.audit.list(params), api.audit.stats()]);
      setEntries(list.entries || []);
      setStats(st);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (entries.length === 0) return;
    const headers = ['Timestamp', 'Risk Level', 'Score', 'User Message', 'Generated SQL', 'Executed', 'Execution Time (ms)', 'Row Count', 'Error'];
    const escapeField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = entries.map(e => [
      e.timestamp,
      formatRisk(e.riskLevel),
      String(e.riskScore),
      escapeField(e.userMessage),
      escapeField(e.generatedSql),
      e.executed ? 'yes' : 'no',
      e.executionTimeMs != null ? String(e.executionTimeMs) : '',
      e.rowCount != null ? String(e.rowCount) : '',
      e.error ? escapeField(e.error) : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [riskFilter]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Audit Log</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Every chat-to-SQL interaction with risk scoring and execution metadata.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={entries.length === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
            style={{
              borderColor: 'var(--border)',
              color: entries.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              background: 'transparent',
              opacity: entries.length === 0 ? 0.5 : 1,
            }}
          >
            Export CSV
          </button>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <StatCard label="Total" value={String(stats.total)} />
          <StatCard label="Avg Score" value={stats.avgScore?.toFixed?.(1) ?? '0'} />
          {RISK_LEVELS.map(level => (
            <StatCard
              key={level.value}
              label={level.label}
              value={String(stats.byRisk?.[level.value] ?? stats.byRisk?.[level.label] ?? 0)}
              color={level.color}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3 items-center">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Filter:</span>
        {[{ value: '', label: 'All' }, ...RISK_LEVELS].map(level => (
          <button
            key={level.value || 'all'}
            onClick={() => setRiskFilter(level.value)}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
            style={
              riskFilter === level.value
                ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' }
                : { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border)' }
            }
          >
            {level.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left px-3 py-2 text-xs font-semibold">Time</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Risk</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Score</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Message</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">SQL</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Exec</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                    No audit entries yet.
                  </td>
                </tr>
              )}
              {entries.map(e => {
                const risk = normalizeRisk(e.riskLevel);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className="cursor-pointer transition-colors"
                    style={{
                      color: 'var(--text-primary)',
                      background: selected?.id === e.id ? 'var(--accent-soft)' : 'transparent',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className="px-2 py-0.5 rounded font-semibold"
                        style={{ background: RISK_COLORS[risk] + '22', color: RISK_COLORS[risk] }}
                      >
                        {formatRisk(e.riskLevel)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{e.riskScore}</td>
                    <td className="px-3 py-2 text-xs max-w-[14rem] truncate">{e.userMessage}</td>
                    <td className="px-3 py-2 text-xs max-w-[20rem] truncate font-mono">{e.generatedSql}</td>
                    <td className="px-3 py-2 text-xs">
                      {e.executed ? (
                        <span style={{ color: '#22c55e' }}>yes {e.executionTimeMs}ms</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>no</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <div
            className="w-96 overflow-y-auto rounded-lg border p-4"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Entry detail</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >Close</button>
            </div>
            <DetailRow label="ID" value={selected.id} />
            <DetailRow label="Session" value={selected.sessionId} />
            <DetailRow label="Connection" value={`${selected.connectionId} / ${selected.database}`} />
            <DetailRow label="Risk" value={`${formatRisk(selected.riskLevel)} (score ${selected.riskScore})`} />
            <DetailRow label="Executed" value={selected.executed ? 'yes' : 'no'} />
            {selected.rowCount != null && <DetailRow label="Rows" value={String(selected.rowCount)} />}
            {selected.error && <DetailRow label="Error" value={selected.error} />}
            <div className="mt-3">
              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Question</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{selected.userMessage}</div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Generated SQL</div>
              <pre
                className="text-xs p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap break-words"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >{selected.generatedSql}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div
    className="rounded-lg px-3 py-2 border"
    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
  >
    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
    <div className="text-lg font-semibold" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
  </div>
);

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="mb-1.5">
    <span className="text-[11px] uppercase mr-2" style={{ color: 'var(--text-muted)' }}>{label}:</span>
    <span className="text-xs break-all" style={{ color: 'var(--text-primary)' }}>{value}</span>
  </div>
);
