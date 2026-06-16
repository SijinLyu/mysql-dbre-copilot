import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { SqlHighlight } from '../SqlDisplay/SqlHighlight';
import { ResultTable } from '../ResultTable/ResultTable';
import { SafetyReportCard } from '../Safety/SafetyReport';
import { DataChart } from '../Charts/DataChart';
import { SaveFavoriteDialog } from '../Favorites/SaveFavoriteDialog';
import { ExportButtons } from '../Export/ExportButtons';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      <div className={`${isUser ? 'max-w-[75%]' : 'max-w-full w-full'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'rounded-tr-md' : ''}`}
          style={isUser
            ? { background: 'var(--user-bubble)', color: 'var(--user-text)' }
            : { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
          }
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {message.sql && !isUser && (
          <div className="relative mt-2.5">
            <SqlHighlight sql={message.sql} />
            <button
              onClick={() => setShowSaveDialog(true)}
              className="absolute top-3 right-3 p-1.5 rounded-md transition-opacity opacity-40 hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
              title="Save to favorites"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          </div>
        )}

        {message.safetyReport && !isUser && message.safetyReport.riskLevel !== 'low' && (
          <div className="mt-2.5"><SafetyReportCard report={message.safetyReport} /></div>
        )}

        {message.chartRecommendation && message.results && message.results.length > 0 && !isUser && (
          <div className="mt-2.5"><DataChart data={message.results} recommendation={message.chartRecommendation} /></div>
        )}

        {message.results && message.results.length > 0 && !isUser && (
          <div className="mt-2.5"><ResultTable results={message.results} /></div>
        )}

        {message.results && message.results.length > 0 && !isUser && (
          <div className="mt-2"><ExportButtons results={message.results} sql={message.sql} safetyReport={message.safetyReport} /></div>
        )}

        {!isUser && (message.executionTimeMs || message.resultCount !== undefined) && (
          <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {message.executionTimeMs && <span>{message.executionTimeMs}ms</span>}
            {message.resultCount !== undefined && <span>{message.resultCount} rows</span>}
            {message.safetyReport && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {message.safetyReport.riskLevel.toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {showSaveDialog && message.sql && (
        <SaveFavoriteDialog sql={message.sql} onClose={() => setShowSaveDialog(false)} />
      )}
    </div>
  );
};
