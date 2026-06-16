import React from 'react';

interface ExportButtonsProps {
  results: Record<string, unknown>[];
  sql?: string;
  safetyReport?: any;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ results, sql, safetyReport }) => {
  const exportCSV = () => {
    if (!results || results.length === 0) return;

    const columns = Object.keys(results[0]);
    const header = columns.join(',');
    const rows = results.map(row =>
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );

    const csv = [header, ...rows].join('\n');
    downloadFile(csv, 'query-results.csv', 'text/csv');
  };

  const exportJSON = () => {
    if (!results || results.length === 0) return;
    const json = JSON.stringify(results, null, 2);
    downloadFile(json, 'query-results.json', 'application/json');
  };

  const exportReport = () => {
    const report: any = {
      exportedAt: new Date().toISOString(),
      sql,
      safetyAnalysis: safetyReport ? {
        riskLevel: safetyReport.riskLevel,
        riskScore: safetyReport.riskScore,
        checks: safetyReport.checks,
        recommendation: safetyReport.recommendation,
      } : null,
      resultCount: results.length,
      results: results.slice(0, 50),
    };

    const json = JSON.stringify(report, null, 2);
    downloadFile(json, 'dbre-report.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!results || results.length === 0) return null;

  return (
    <div className="flex gap-1 mt-2">
      <button
        onClick={exportCSV}
        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
        title="Export as CSV"
      >
        CSV
      </button>
      <button
        onClick={exportJSON}
        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
        title="Export as JSON"
      >
        JSON
      </button>
      <button
        onClick={exportReport}
        className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
        title="Export full report"
      >
        Report
      </button>
    </div>
  );
};
