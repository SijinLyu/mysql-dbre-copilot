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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`${isUser ? 'max-w-[70%]' : 'max-w-[90%] w-full'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-slate-700 text-slate-100'
        }`}>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* SQL display with save button */}
        {message.sql && !isUser && (
          <div className="relative">
            <SqlHighlight sql={message.sql} />
            <button
              onClick={() => setShowSaveDialog(true)}
              className="absolute top-2 right-2 p-1 text-slate-500 hover:text-yellow-400 transition-colors"
              title="Save to favorites"
            >
              ★
            </button>
          </div>
        )}

        {/* Safety report */}
        {message.safetyReport && !isUser && (
          <SafetyReportCard report={message.safetyReport} />
        )}

        {/* Chart visualization */}
        {message.chartRecommendation && message.results && message.results.length > 0 && !isUser && (
          <DataChart data={message.results} recommendation={message.chartRecommendation} />
        )}

        {/* Result table */}
        {message.results && message.results.length > 0 && !isUser && (
          <ResultTable results={message.results} />
        )}

        {/* Export buttons */}
        {message.results && message.results.length > 0 && !isUser && (
          <ExportButtons results={message.results} sql={message.sql} safetyReport={message.safetyReport} />
        )}

        {/* Metadata */}
        {!isUser && (message.executionTimeMs || message.resultCount !== undefined) && (
          <div className="text-xs text-slate-500 mt-1 px-1 flex gap-3">
            {message.executionTimeMs && <span>{message.executionTimeMs}ms</span>}
            {message.resultCount !== undefined && <span>{message.resultCount} rows</span>}
            {message.safetyReport && (
              <span className={
                message.safetyReport.riskLevel === 'low' ? 'text-green-500' :
                message.safetyReport.riskLevel === 'medium' ? 'text-yellow-500' : 'text-red-500'
              }>
                Risk: {message.safetyReport.riskLevel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Save favorite dialog */}
      {showSaveDialog && message.sql && (
        <SaveFavoriteDialog sql={message.sql} onClose={() => setShowSaveDialog(false)} />
      )}
    </div>
  );
};
