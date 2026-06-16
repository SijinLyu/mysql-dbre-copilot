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
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="my-2 border border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 sticky top-0">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2 text-left text-slate-400 font-medium cursor-pointer hover:text-white whitespace-nowrap"
                >
                  {col}
                  {sortCol === col && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedResults.map((row, i) => (
              <tr key={i} className="hover:bg-slate-800/50">
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 text-slate-300 whitespace-nowrap">
                    {row[col] === null ? <span className="text-slate-600">NULL</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.length > maxRows && (
        <div className="px-3 py-2 bg-slate-800 text-xs text-slate-500 border-t border-slate-700">
          Showing {maxRows} of {results.length} rows
        </div>
      )}
    </div>
  );
};
