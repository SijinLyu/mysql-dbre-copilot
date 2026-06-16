import React from 'react';
import { SafetyReport as SafetyReportType } from '../../types';

interface RiskBadgeProps {
  level: string;
  score: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score }) => {
  const colors: Record<string, string> = {
    low: 'bg-green-900/50 text-green-300 border-green-700',
    medium: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    high: 'bg-red-900/50 text-red-300 border-red-700',
    critical: 'bg-red-900/80 text-red-200 border-red-600',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[level] || colors.low}`}>
      {level.toUpperCase()} ({score}/100)
    </span>
  );
};

interface SafetyReportProps {
  report: SafetyReportType;
}

export const SafetyReportCard: React.FC<SafetyReportProps> = ({ report }) => {
  const failedChecks = report.checks.filter(c => !c.passed);

  return (
    <div className="my-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">Safety Analysis</span>
        <RiskBadge level={report.riskLevel} score={report.riskScore} />
      </div>

      {failedChecks.length > 0 && (
        <ul className="space-y-1 mt-2">
          {failedChecks.map((check, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className={check.severity === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                {check.severity === 'error' ? '●' : '○'}
              </span>
              <span className="text-slate-300">{check.message}</span>
            </li>
          ))}
        </ul>
      )}

      {report.explainAnalysis && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex gap-3 text-xs text-slate-500">
            {report.explainAnalysis.hasFullTableScan && <span className="text-red-400">Full Scan</span>}
            {report.explainAnalysis.hasFilesort && <span className="text-yellow-400">Filesort</span>}
            {report.explainAnalysis.hasTempTable && <span className="text-yellow-400">Temp Table</span>}
            <span>~{report.explainAnalysis.estimatedRows.toLocaleString()} rows</span>
          </div>
        </div>
      )}
    </div>
  );
};
