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
];

export const SqlHighlight: React.FC<SqlHighlightProps> = ({ sql }) => {
  const highlightSql = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'gi');
    let lastIndex = 0;
    let match;

    const tempRegex = new RegExp(regex.source, 'gi');
    while ((match = tempRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
        );
      }
      parts.push(
        <span key={`k-${match.index}`} className="text-blue-400 font-medium">
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
    <div className="bg-slate-900 rounded-lg p-3 my-2 border border-slate-700 overflow-x-auto">
      <pre className="text-sm font-mono whitespace-pre-wrap text-slate-200">
        {highlightSql(sql)}
      </pre>
    </div>
  );
};
