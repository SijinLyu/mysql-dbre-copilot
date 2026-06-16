import React from 'react';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-slate-700 text-slate-100'
        }`}>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
        {message.executionTimeMs && (
          <div className="text-xs text-slate-500 mt-1 px-1">
            {message.executionTimeMs}ms
            {message.resultCount !== undefined && ` · ${message.resultCount} rows`}
          </div>
        )}
      </div>
    </div>
  );
};
