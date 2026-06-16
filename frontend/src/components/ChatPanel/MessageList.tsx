import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ask anything about your data</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>I'll generate SQL, check safety, and show you results.</p>
          <div className="space-y-2 text-left">
            {[
              '"Show me the top 5 products by price"',
              '"Which customers ordered the most?"',
              '"How many orders are pending vs delivered?"',
            ].map((q, i) => (
              <div key={i} className="px-3.5 py-2.5 rounded-xl text-xs border" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in-up">
            <MessageBubble message={msg} />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="rounded-2xl px-4 py-3 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full dot-1" style={{ background: 'var(--accent)' }} />
                <span className="w-2 h-2 rounded-full dot-2" style={{ background: 'var(--accent)' }} />
                <span className="w-2 h-2 rounded-full dot-3" style={{ background: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
