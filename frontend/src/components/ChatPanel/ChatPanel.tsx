import React from 'react';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { useStore } from '../../store';
import { ChatMessage } from '../../types';

export const ChatPanel: React.FC = () => {
  const {
    messages, sessionId, isLoading, activeConnectionId, activeDatabase,
    addMessage, setLoading, setAbortController, abortCurrent,
  } = useStore();

  const lastSuggestions = messages.length > 0
    ? messages[messages.length - 1].followUpSuggestions
    : undefined;

  const handleSend = async (message: string) => {
    if (!activeConnectionId || !activeDatabase) {
      addMessage({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        content: 'Please connect to a database first using the sidebar.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, connectionId: activeConnectionId, message, database: activeDatabase }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      addMessage({
        id: data.id,
        sessionId,
        role: 'assistant',
        content: data.message,
        sql: data.sql,
        results: data.results,
        resultCount: data.resultCount,
        executionTimeMs: data.executionTimeMs,
        chartRecommendation: data.chartRecommendation,
        safetyReport: data.safetyReport,
        followUpSuggestions: data.followUpSuggestions,
        timestamp: data.timestamp,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        addMessage({
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          content: 'Request stopped.',
          timestamp: new Date().toISOString(),
        });
      } else {
        addMessage({
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          content: `Error: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBar
        onSend={handleSend}
        onStop={abortCurrent}
        isLoading={isLoading}
        suggestions={lastSuggestions}
      />
    </div>
  );
};
