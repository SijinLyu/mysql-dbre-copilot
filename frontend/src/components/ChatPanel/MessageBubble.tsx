import React from 'react';
import { ChatMessage } from '../../types';
import { SqlHighlight } from '../SqlDisplay/SqlHighlight';
import { ResultTable } from '../ResultTable/ResultTable';
import { SafetyReportCard } from '../Safety/SafetyReport';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

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

        {/* SQL display */}
        {message.sql && !isUser && (
          <SqlHighlight sql={message.sql} />
        )}

        {/* Safety report */}
        {message.safetyReport && !isUser && (
          <SafetyReportCard report={message.safetyReport} />
        )}

        {/* Result table */}
        {message.results && message.results.length > 0 && !isUser && (
          <ResultTable results={message.results} />
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
    </div>
  );
};
