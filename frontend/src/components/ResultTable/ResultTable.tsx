import React, { useState } from 'react';

interface ResultTableProps {
  results: Record<string, unknown>[];
  maxRows?: number;
}

export const ResultTable: React.FC<ResultTableProps> = ({ results, maxRows = 50 }) => {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (!results || results.length === 0) return null;

  const columns = Object.keys(results[0]);

  const sortedResults = [...results].slice(0, maxRows).sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: 'var(--bg-elevated)' }}>
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-left font-medium cursor-pointer whitespace-nowrap border-b transition-colors"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((row, i) => (
              <tr key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                {columns.map(col => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap font-mono" style={{ color: 'var(--text-primary)' }}>
                    {row[col] === null ? <span style={{ color: 'var(--text-muted)' }}>NULL</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.length > maxRows && (
        <div className="px-3 py-2 text-xs text-center border-t" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
          Showing {maxRows} of {results.length} rows
        </div>
      )}
    </div>
  );
};
