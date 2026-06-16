import { ConversationManager } from '../../../src/chat/conversation-manager.js';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager(10);
  });

  it('adds and retrieves messages', () => {
    manager.addMessage('session1', {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date(),
    });

    const history = manager.getHistory('session1');
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('Hello');
  });

  it('returns empty for unknown session', () => {
    const history = manager.getHistory('unknown');
    expect(history).toHaveLength(0);
  });

  it('maintains conversation order', () => {
    manager.addMessage('s1', { id: '1', role: 'user', content: 'Q1', timestamp: new Date() });
    manager.addMessage('s1', { id: '2', role: 'assistant', content: 'A1', timestamp: new Date() });
    manager.addMessage('s1', { id: '3', role: 'user', content: 'Q2', timestamp: new Date() });

    const history = manager.getHistory('s1');
    expect(history).toHaveLength(3);
    expect(history[0].content).toBe('Q1');
    expect(history[2].content).toBe('Q2');
  });

  it('limits history retrieval', () => {
    for (let i = 0; i < 15; i++) {
      manager.addMessage('s1', { id: String(i), role: 'user', content: `msg${i}`, timestamp: new Date() });
    }

    const limited = manager.getHistory('s1', 5);
    expect(limited).toHaveLength(5);
    expect(limited[0].content).toBe('msg10');
  });

  it('formats history for prompt', () => {
    manager.addMessage('s1', { id: '1', role: 'user', content: 'What tables exist?', timestamp: new Date() });
    manager.addMessage('s1', { id: '2', role: 'assistant', content: 'There are 5 tables.', timestamp: new Date(), metadata: { sql: 'SHOW TABLES' } });

    const formatted = manager.formatHistoryForPrompt('s1');
    expect(formatted).toContain('User: What tables exist?');
    expect(formatted).toContain('Assistant: There are 5 tables.');
    expect(formatted).toContain('[SQL: SHOW TABLES]');
  });

  it('clears session', () => {
    manager.addMessage('s1', { id: '1', role: 'user', content: 'test', timestamp: new Date() });
    manager.clearSession('s1');
    expect(manager.getHistory('s1')).toHaveLength(0);
  });

  it('isolates sessions', () => {
    manager.addMessage('s1', { id: '1', role: 'user', content: 'session1', timestamp: new Date() });
    manager.addMessage('s2', { id: '2', role: 'user', content: 'session2', timestamp: new Date() });

    expect(manager.getHistory('s1')[0].content).toBe('session1');
    expect(manager.getHistory('s2')[0].content).toBe('session2');
  });
});
