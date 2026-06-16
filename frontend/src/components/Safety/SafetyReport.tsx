import React from 'react';
import { SafetyReport as SafetyReportType } from '../../types';

interface RiskBadgeProps {
  level: string;
  score: number;
}

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16a34a' },
  medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706' },
  high: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' },
  critical: { bg: 'rgba(239, 68, 68, 0.2)', text: '#b91c1c' },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score }) => {
  const c = RISK_COLORS[level] || RISK_COLORS.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: c.bg, color: c.text }}>
      {level.toUpperCase()} {score}/100
    </span>
  );
};

interface SafetyReportProps {
  report: SafetyReportType;
}

export const SafetyReportCard: React.FC<SafetyReportProps> = ({ report }) => {
  const failedChecks = report.checks.filter(c => !c.passed);

  return (
    <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Safety Analysis
        </span>
        <RiskBadge level={report.riskLevel} score={report.riskScore} />
      </div>

      {failedChecks.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {failedChecks.map((check, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: check.severity === 'error' ? '#ef4444' : '#f59e0b' }} />
              <span>{check.message}</span>
            </li>
          ))}
        </ul>
      )}

      {report.explainAnalysis && (
        <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {report.explainAnalysis.hasFullTableScan && (
              <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>Full Scan</span>
            )}
            {report.explainAnalysis.hasFilesort && (
              <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Filesort</span>
            )}
            {report.explainAnalysis.hasTempTable && (
              <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>Temp Table</span>
            )}
            <span className="px-2 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              ~{report.explainAnalysis.estimatedRows.toLocaleString()} rows
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
