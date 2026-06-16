import { create } from 'zustand';
import { ChatMessage, Connection, Favorite } from '../types';

type Theme = 'dark' | 'light';

interface ConnectionHistoryEntry {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  lastUsedAt: string;
}

interface AppState {
  // Chat
  messages: ChatMessage[];
  sessionId: string;
  isLoading: boolean;
  abortController: AbortController | null;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  abortCurrent: () => void;
  clearMessages: () => void;

  // Connections (active session)
  connections: Connection[];
  activeConnectionId: string | null;
  activeDatabase: string | null;
  setConnections: (conns: Connection[]) => void;
  setActiveConnection: (id: string, database: string) => void;
  addConnection: (conn: Connection) => void;
  removeConnection: (id: string) => void;

  // Connection history (persisted across sessions)
  connectionHistory: ConnectionHistoryEntry[];
  addToHistory: (entry: ConnectionHistoryEntry) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Favorites
  favorites: Favorite[];
  addFavorite: (fav: Favorite) => void;
  removeFavorite: (id: string) => void;
  setFavorites: (favs: Favorite[]) => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

const HISTORY_KEY = 'connection-history';
const FAVORITES_KEY = 'query-favorites';

const loadHistory = (): ConnectionHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveHistory = (history: ConnectionHistoryEntry[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const loadFavorites = (): Favorite[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveFavorites = (favs: Favorite[]) => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
};

export const useStore = create<AppState>((set, get) => ({
  // Chat state
  messages: [],
  sessionId: crypto.randomUUID(),
  isLoading: false,
  abortController: null,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAbortController: (ctrl) => set({ abortController: ctrl }),
  abortCurrent: () => {
    const ctrl = get().abortController;
    if (ctrl) {
      ctrl.abort();
      set({ abortController: null, isLoading: false });
    }
  },
  clearMessages: () => set({ messages: [], sessionId: crypto.randomUUID() }),

  // Connections state
  connections: [],
  activeConnectionId: null,
  activeDatabase: null,
  setConnections: (conns) => set({ connections: conns }),
  setActiveConnection: (id, database) => set({ activeConnectionId: id, activeDatabase: database }),
  addConnection: (conn) => set((state) => ({ connections: [...state.connections, conn] })),
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter(c => c.id !== id),
    activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
  })),

  // History
  connectionHistory: loadHistory(),
  addToHistory: (entry) => set((state) => {
    const filtered = state.connectionHistory.filter(h => h.id !== entry.id);
    const next = [entry, ...filtered].slice(0, 10);
    saveHistory(next);
    return { connectionHistory: next };
  }),
  removeFromHistory: (id) => set((state) => {
    const next = state.connectionHistory.filter(h => h.id !== id);
    saveHistory(next);
    return { connectionHistory: next };
  }),
  clearHistory: () => {
    saveHistory([]);
    set({ connectionHistory: [] });
  },

  // Favorites
  favorites: loadFavorites(),
  addFavorite: (fav) => set((state) => {
    const next = [...state.favorites, fav];
    saveFavorites(next);
    return { favorites: next };
  }),
  removeFavorite: (id) => set((state) => {
    const next = state.favorites.filter(f => f.id !== id);
    saveFavorites(next);
    return { favorites: next };
  }),
  setFavorites: (favs) => {
    saveFavorites(favs);
    set({ favorites: favs });
  },

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    return { theme: next };
  }),
}));
