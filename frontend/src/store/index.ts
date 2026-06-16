import { create } from 'zustand';
import { ChatMessage, Connection, Favorite } from '../types';

interface AppState {
  // Chat
  messages: ChatMessage[];
  sessionId: string;
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;

  // Connections
  connections: Connection[];
  activeConnectionId: string | null;
  activeDatabase: string | null;
  setConnections: (conns: Connection[]) => void;
  setActiveConnection: (id: string, database: string) => void;
  addConnection: (conn: Connection) => void;
  removeConnection: (id: string) => void;

  // Favorites
  favorites: Favorite[];
  addFavorite: (fav: Favorite) => void;
  removeFavorite: (id: string) => void;
  setFavorites: (favs: Favorite[]) => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Chat state
  messages: [],
  sessionId: crypto.randomUUID(),
  isLoading: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setLoading: (loading) => set({ isLoading: loading }),
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

  // Favorites state
  favorites: [],
  addFavorite: (fav) => set((state) => ({ favorites: [...state.favorites, fav] })),
  removeFavorite: (id) => set((state) => ({ favorites: state.favorites.filter(f => f.id !== id) })),
  setFavorites: (favs) => set({ favorites: favs }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
