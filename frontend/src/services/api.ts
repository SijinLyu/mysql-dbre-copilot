const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  chat: {
    send(sessionId: string, connectionId: string, message: string, database: string) {
      return request<any>('/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, connectionId, message, database }),
      });
    },
    getHistory(sessionId: string) {
      return request<any>(`/chat/history/${sessionId}`);
    },
    clearHistory(sessionId: string) {
      return request<any>(`/chat/history/${sessionId}`, { method: 'DELETE' });
    },
  },

  connections: {
    list() {
      return request<any>('/connections');
    },
    add(conn: { id: string; host: string; port: number; user: string; password: string; database: string }) {
      return request<any>('/connections', {
        method: 'POST',
        body: JSON.stringify(conn),
      });
    },
    remove(id: string) {
      return request<any>(`/connections/${id}`, { method: 'DELETE' });
    },
  },

  schema: {
    get(connectionId: string, database: string) {
      return request<any>(`/schema/${connectionId}?database=${database}`);
    },
  },

  audit: {
    list(params?: Record<string, string>) {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/audit${query}`);
    },
    stats() {
      return request<any>('/audit/stats');
    },
  },
};
