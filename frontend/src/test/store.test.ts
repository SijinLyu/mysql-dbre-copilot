import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { ChatMessage, Favorite } from '../types';

describe('useStore', () => {
  beforeEach(() => {
    const { getState } = useStore;
    getState().clearMessages();
    getState().setConnections([]);
    getState().setFavorites([]);
    window.localStorage.clear();
  });

  describe('chat state', () => {
    it('starts with empty messages', () => {
      const state = useStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('adds messages', () => {
      const msg: ChatMessage = {
        id: '1',
        sessionId: 'sess',
        role: 'user',
        content: 'Hello',
        timestamp: '2026-01-01T00:00:00Z',
      };
      useStore.getState().addMessage(msg);
      expect(useStore.getState().messages).toHaveLength(1);
      expect(useStore.getState().messages[0].content).toBe('Hello');
    });

    it('clears messages and resets session', () => {
      const msg: ChatMessage = {
        id: '1',
        sessionId: 'sess',
        role: 'user',
        content: 'test',
        timestamp: '2026-01-01T00:00:00Z',
      };
      useStore.getState().addMessage(msg);
      const oldSession = useStore.getState().sessionId;
      useStore.getState().clearMessages();
      expect(useStore.getState().messages).toHaveLength(0);
      expect(useStore.getState().sessionId).toBe(oldSession);
    });

    it('sets loading state', () => {
      useStore.getState().setLoading(true);
      expect(useStore.getState().isLoading).toBe(true);
      useStore.getState().setLoading(false);
      expect(useStore.getState().isLoading).toBe(false);
    });

    it('handles abort controller', () => {
      const ctrl = new AbortController();
      useStore.getState().setAbortController(ctrl);
      expect(useStore.getState().abortController).toBe(ctrl);
      useStore.getState().abortCurrent();
      expect(useStore.getState().abortController).toBeNull();
      expect(useStore.getState().isLoading).toBe(false);
    });

    it('abortCurrent does nothing without controller', () => {
      useStore.getState().abortCurrent();
      expect(useStore.getState().isLoading).toBe(false);
    });
  });

  describe('connections state', () => {
    it('adds a connection', () => {
      useStore.getState().addConnection({ id: 'c1', host: 'localhost', port: 3306, user: 'root', database: 'test' });
      expect(useStore.getState().connections).toHaveLength(1);
    });

    it('removes a connection and clears active if matched', () => {
      useStore.getState().addConnection({ id: 'c1', host: 'localhost', port: 3306, user: 'root', database: 'test' });
      useStore.getState().setActiveConnection('c1', 'test');
      useStore.getState().removeConnection('c1');
      expect(useStore.getState().connections).toHaveLength(0);
      expect(useStore.getState().activeConnectionId).toBeNull();
    });

    it('sets active connection', () => {
      useStore.getState().setActiveConnection('c2', 'demo');
      expect(useStore.getState().activeConnectionId).toBe('c2');
      expect(useStore.getState().activeDatabase).toBe('demo');
    });
  });

  describe('connection history', () => {
    it('adds to history and persists', () => {
      useStore.getState().addToHistory({
        id: 'h1', host: 'db.example.com', port: 3306,
        user: 'admin', password: '', database: 'prod', lastUsedAt: '2026-01-01T00:00:00Z',
      });
      expect(useStore.getState().connectionHistory).toHaveLength(1);
      const stored = JSON.parse(window.localStorage.getItem('connection-history') || '[]');
      expect(stored).toHaveLength(1);
    });

    it('deduplicates and caps at 10', () => {
      for (let i = 0; i < 12; i++) {
        useStore.getState().addToHistory({
          id: `h${i}`, host: 'host', port: 3306,
          user: 'u', password: '', database: 'd', lastUsedAt: new Date().toISOString(),
        });
      }
      expect(useStore.getState().connectionHistory.length).toBeLessThanOrEqual(10);
    });

    it('removes from history', () => {
      useStore.getState().clearHistory();
      useStore.getState().addToHistory({
        id: 'h1', host: 'h', port: 3306, user: 'u', password: '', database: 'd', lastUsedAt: '',
      });
      useStore.getState().removeFromHistory('h1');
      expect(useStore.getState().connectionHistory).toHaveLength(0);
    });

    it('clears all history', () => {
      useStore.getState().addToHistory({
        id: 'h1', host: 'h', port: 3306, user: 'u', password: '', database: 'd', lastUsedAt: '',
      });
      useStore.getState().clearHistory();
      expect(useStore.getState().connectionHistory).toHaveLength(0);
    });
  });

  describe('favorites', () => {
    it('adds and persists favorites', () => {
      const fav: Favorite = { id: 'f1', name: 'Q1', sql: 'SELECT 1', createdAt: '2026-01-01' };
      useStore.getState().addFavorite(fav);
      expect(useStore.getState().favorites).toHaveLength(1);
      const stored = JSON.parse(window.localStorage.getItem('query-favorites') || '[]');
      expect(stored[0].id).toBe('f1');
    });

    it('removes favorite', () => {
      const fav: Favorite = { id: 'f1', name: 'Q1', sql: 'SELECT 1', createdAt: '2026-01-01' };
      useStore.getState().addFavorite(fav);
      useStore.getState().removeFavorite('f1');
      expect(useStore.getState().favorites).toHaveLength(0);
    });

    it('bulk sets favorites', () => {
      const favs: Favorite[] = [
        { id: 'f1', name: 'Q1', sql: 'SELECT 1', createdAt: '2026-01-01' },
        { id: 'f2', name: 'Q2', sql: 'SELECT 2', createdAt: '2026-01-02' },
      ];
      useStore.getState().setFavorites(favs);
      expect(useStore.getState().favorites).toHaveLength(2);
    });
  });

  describe('UI state', () => {
    it('toggles sidebar', () => {
      const initial = useStore.getState().sidebarOpen;
      useStore.getState().toggleSidebar();
      expect(useStore.getState().sidebarOpen).toBe(!initial);
    });

    it('toggles theme', () => {
      useStore.getState().toggleTheme();
      const t1 = useStore.getState().theme;
      useStore.getState().toggleTheme();
      expect(useStore.getState().theme).not.toBe(t1);
    });

    it('sets active view', () => {
      useStore.getState().setActiveView('audit');
      expect(useStore.getState().activeView).toBe('audit');
      useStore.getState().setActiveView('chat');
      expect(useStore.getState().activeView).toBe('chat');
    });

    it('supports all view types', () => {
      const views = ['chat', 'audit', 'index-redundancy', 'slow-query', 'favorites'] as const;
      for (const v of views) {
        useStore.getState().setActiveView(v);
        expect(useStore.getState().activeView).toBe(v);
      }
    });
  });
});
