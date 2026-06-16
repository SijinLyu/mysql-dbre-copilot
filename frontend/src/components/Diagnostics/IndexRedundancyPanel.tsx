import React, { useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../services/api';

interface RedundantIndex {
  table: string;
  redundantIndex: string;
  coveredBy: string;
  reason: string;
  dropStatement: string;
}

interface DuplicateIndex {
  table: string;
  indexA: string;
  indexB: string;
  columns: string[];
  reason: string;
}

interface UnusedIndexHint {
  table: string;
  index: string;
  reason: string;
}

interface RedundancyReport {
  database: string;
  tableCount: number;
  totalIssues: number;
  redundant: RedundantIndex[];
  duplicates: DuplicateIndex[];
  potentiallyUnused: UnusedIndexHint[];
}

export const IndexRedundancyPanel: React.FC = () => {
  const { activeConnectionId, activeDatabase } = useStore();
  const [report, setReport] = useState<RedundancyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!activeConnectionId || !activeDatabase) {
      setError('Connect to a database first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.diagnostics.indexRedundancy(activeConnectionId, activeDatabase);
      setReport(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Index Redundancy</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Detects duplicate, prefix-redundant, and PK-shadowed indexes that can usually be dropped.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Analyzing…' : 'Run Analysis'}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {!report && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No analysis yet. Click <em>Run Analysis</em> to scan the active database.</p>
            {(!activeConnectionId || !activeDatabase) && (
              <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
                Select an active connection in the sidebar first.
              </p>
            )}
          </div>
        </div>
      )}

      {report && (
        <div className="flex-1 overflow-y-auto space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Tables Scanned" value={report.tableCount} />
            <Stat label="Total Issues" value={report.totalIssues} accent={report.totalIssues > 0} />
            <Stat label="Redundant" value={report.redundant.length} />
            <Stat label="Duplicates" value={report.duplicates.length} />
          </div>

          <Section title="Redundant Indexes" count={report.redundant.length}>
            {report.redundant.length === 0 ? (
              <Empty />
            ) : (
              report.redundant.map((r, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.table}.{r.redundantIndex}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      covered by {r.coveredBy}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.reason}</p>
                  <pre className="text-[11px] font-mono p-2 rounded overflow-x-auto"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {r.dropStatement}
                  </pre>
                </div>
              ))
            )}
          </Section>

          <Section title="Duplicate Indexes" count={report.duplicates.length}>
            {report.duplicates.length === 0 ? <Empty /> : report.duplicates.map((d, i) => (
              <div key={i} className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {d.table}: {d.indexA} ⇄ {d.indexB}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.reason}</p>
                <p className="text-[11px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                  Columns: {d.columns.join(', ')}
                </p>
              </div>
            ))}
          </Section>

          <Section title="Potentially Unused" count={report.potentiallyUnused.length}>
            {report.potentiallyUnused.length === 0 ? <Empty /> : report.potentiallyUnused.map((u, i) => (
              <div key={i} className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {u.table}.{u.index}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.reason}</p>
              </div>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="rounded-lg border px-3 py-2.5"
    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
    <div className="text-2xl font-semibold"
      style={{ color: accent && value > 0 ? '#f97316' : 'var(--text-primary)' }}>{value}</div>
  </div>
);

const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
  <div>
    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
      {title} <span style={{ color: 'var(--text-muted)' }}>({count})</span>
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Empty: React.FC = () => (
  <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No issues detected.</p>
);
