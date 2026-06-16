import { LLMMessage } from '../llm/types.js';

export interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    sql?: string;
    executionTimeMs?: number;
  };
}

export class ConversationManager {
  private conversations = new Map<string, ConversationEntry[]>();
  private maxHistoryPerSession: number;

  constructor(maxHistoryPerSession: number = 20) {
    this.maxHistoryPerSession = maxHistoryPerSession;
  }

  addMessage(sessionId: string, entry: ConversationEntry): void {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
    const history = this.conversations.get(sessionId)!;
    history.push(entry);

    if (history.length > this.maxHistoryPerSession * 2) {
      this.conversations.set(sessionId, history.slice(-this.maxHistoryPerSession));
    }
  }

  getHistory(sessionId: string, limit?: number): ConversationEntry[] {
    const history = this.conversations.get(sessionId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return history;
  }

  getContextMessages(sessionId: string, limit: number = 10): LLMMessage[] {
    const history = this.getHistory(sessionId, limit);
    return history.map(entry => ({
      role: entry.role as 'user' | 'assistant',
      content: entry.content,
    }));
  }

  formatHistoryForPrompt(sessionId: string, limit: number = 6): string {
    const history = this.getHistory(sessionId, limit);
    if (history.length === 0) return '';

    return history.map(entry => {
      let line = `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`;
      if (entry.metadata?.sql) {
        line += `\n[SQL: ${entry.metadata.sql}]`;
      }
      return line;
    }).join('\n\n');
  }

  clearSession(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  getSessionIds(): string[] {
    return Array.from(this.conversations.keys());
  }
}
