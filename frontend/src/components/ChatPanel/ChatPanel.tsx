import React from 'react';
import { MessageList } from './MessageList';
import { InputBar } from './InputBar';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { ChatMessage } from '../../types';

export const ChatPanel: React.FC = () => {
  const {
    messages, sessionId, isLoading, activeConnectionId, activeDatabase,
    addMessage, setLoading
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

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const response = await api.chat.send(sessionId, activeConnectionId, message, activeDatabase);
      const assistantMsg: ChatMessage = {
        id: response.id,
        sessionId,
        role: 'assistant',
        content: response.message,
        sql: response.sql,
        results: response.results,
        resultCount: response.resultCount,
        executionTimeMs: response.executionTimeMs,
        chartRecommendation: response.chartRecommendation,
        safetyReport: response.safetyReport,
        followUpSuggestions: response.followUpSuggestions,
        timestamp: response.timestamp,
      };
      addMessage(assistantMsg);
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <MessageList messages={messages} isLoading={isLoading} />
      <InputBar
        onSend={handleSend}
        disabled={isLoading}
        suggestions={lastSuggestions}
      />
    </div>
  );
};
