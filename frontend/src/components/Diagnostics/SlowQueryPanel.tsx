import React, { useState } from 'react';
import { api } from '../../services/api';

interface SlowQueryEntry {
  timestamp: string;
  user: string;
  host: string;
  queryTimeMs: number;
  lockTimeMs: number;
  rowsSent: number;
  rowsExamined: number;
  database: string;
  sql: string;
}

interface SlowQueryStats {
  totalQueries: number;
  avgQueryTimeMs: number;
  maxQueryTimeMs: number;
  totalRowsExamined: number;
  topSlowQueries: SlowQueryEntry[];
  byUser: Record<string, number>;
  byDatabase: Record<string, number>;
}

interface FingerprintGroup {
  fingerprint: string;
  count: number;
  totalTimeMs: number;
  avgTimeMs: number;
  maxTimeMs: number;
  sample: string;
}

const SAMPLE_LOG = `# Time: 2026-06-15T10:30:00.123456Z
# User@Host: app[app] @ localhost []  Id: 42
# Query_time: 5.123456  Lock_time: 0.000123 Rows_sent: 1  Rows_examined: 100000
SET timestamp=1718448600;
use demo;
SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE country = 'CN');
# Time: 2026-06-15T10:31:00.123456Z
# User@Host: app[app] @ localhost []  Id: 43
# Query_time: 2.500000  Lock_time: 0.000050 Rows_sent: 50  Rows_examined: 50000
SET timestamp=1718448660;
use demo;
SELECT COUNT(*) FROM order_items WHERE created_at > '2026-01-01';
`;

export const SlowQueryPanel: React.FC = () => {
  const [content, setContent] = useState('');
  const [stats, setStats] = useState<SlowQueryStats | null>(null);
  const [fingerprints, setFingerprints] = useState<FingerprintGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'top' | 'fingerprints' | 'breakdown'>('top');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setContent(String(ev.target?.result || ''));
    reader.readAsText(file);
  };

  const analyze = async () => {
    if (!content.trim()) { setError('Paste or upload slow log content first.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.diagnostics.parseSlowLog(content);
      setStats(res.stats);
      setFingerprints(res.fingerprints || []);
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Slow Query Analysis</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Parse a MySQL slow query log, see hot queries, and group by fingerprint.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setContent(SAMPLE_LOG)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
          >Use sample</button>
          <label
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Upload .log
            <input type="file" accept=".log,.txt" onChange={handleFile} className="hidden" />
          </label>
          <button
            onClick={analyze}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.6 : 1 }}
          >{loading ? 'Parsing…' : 'Analyze'}</button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste slow query log content here…"
        className="w-full h-32 rounded-lg p-3 text-xs font-mono mb-3 border resize-none"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
      />

      {error && (
        <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Stat label="Total Queries" value={stats.totalQueries} />
            <Stat label="Avg Time (ms)" value={stats.avgQueryTimeMs} />
            <Stat label="Max Time (ms)" value={stats.maxQueryTimeMs} accent />
            <Stat label="Rows Examined" value={stats.totalRowsExamined} />
          </div>

          <div className="flex gap-2 mb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            {(['top', 'fingerprints', 'breakdown'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {t === 'top' ? 'Top Slow' : t === 'fingerprints' ? `Fingerprints (${fingerprints.length})` : 'Breakdown'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === 'top' && (
              <div className="space-y-2">
                {stats.topSlowQueries.map((q, i) => (
                  <div key={i} className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
                        {q.queryTimeMs.toFixed(2)}ms
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {q.user}@{q.host} · {q.database || '—'} · scanned {q.rowsExamined.toLocaleString()} rows
                      </span>
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words"
                      style={{ color: 'var(--text-primary)' }}>{q.sql}</pre>
                  </div>
                ))}
              </div>
            )}

            {tab === 'fingerprints' && (
              <div className="space-y-2">
                {fingerprints.map((g, i) => (
                  <div key={i} className="rounded-lg border p-3"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {g.count}× · total {g.totalTimeMs.toFixed(0)}ms
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        avg {g.avgTimeMs.toFixed(1)}ms · max {g.maxTimeMs.toFixed(1)}ms
                      </span>
                    </div>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words"
                      style={{ color: 'var(--text-secondary)' }}>{g.sample}</pre>
                  </div>
                ))}
              </div>
            )}

            {tab === 'breakdown' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>By User</h4>
                  {Object.entries(stats.byUser).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b"
                      style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{k}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>By Database</h4>
                  {Object.entries(stats.byDatabase).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b"
                      style={{ borderColor: 'var(--border)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{k || '—'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div className="rounded-lg border px-3 py-2.5"
    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
    <div className="text-2xl font-semibold"
      style={{ color: accent ? '#f97316' : 'var(--text-primary)' }}>
      {Number.isFinite(value) ? Number(value).toLocaleString() : '0'}
    </div>
  </div>
);
