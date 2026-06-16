import React from 'react';

interface SqlHighlightProps {
  sql: string;
}

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
  'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'HAVING',
  'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'WITH', 'UNION', 'ALL',
  'SHOW', 'TABLES', 'DESCRIBE', 'EXPLAIN',
];

export const SqlHighlight: React.FC<SqlHighlightProps> = ({ sql }) => {
  const highlightSql = (text: string) => {
    const parts: React.ReactNode[] = [];
    const tempRegex = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'gi');
    let lastIndex = 0;
    let match;

    while ((match = tempRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      parts.push(
        <span key={`k-${match.index}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>
          {match[0].toUpperCase()}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`e-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className="rounded-xl p-3.5 border overflow-x-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: '#ff5f57' }}></div>
        <div className="w-2 h-2 rounded-full" style={{ background: '#febc2e' }}></div>
        <div className="w-2 h-2 rounded-full" style={{ background: '#28c840' }}></div>
        <span className="text-[10px] ml-2 font-mono" style={{ color: 'var(--text-muted)' }}>SQL</span>
      </div>
      <pre className="text-[13px] font-mono whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        {highlightSql(sql)}
      </pre>
    </div>
  );
};
