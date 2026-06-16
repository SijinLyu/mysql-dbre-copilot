import React, { useState } from 'react';
import { useStore } from '../../store';
import { ConnectionForm } from './ConnectionForm';
import { SchemaTree } from './SchemaTree';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const {
    connections, activeConnectionId, setActiveConnection, removeConnection,
    addConnection, connectionHistory, addToHistory, removeFromHistory,
  } = useStore();
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [reconnectError, setReconnectError] = useState<{ id: string; msg: string } | null>(null);

  const handleSelect = (id: string, database: string) => setActiveConnection(id, database);

  const handleRemove = async (id: string) => {
    try {
      await api.connections.remove(id);
      removeConnection(id);
    } catch (err) {
      console.error('Failed to remove connection:', err);
    }
  };

  const handleReconnect = async (entry: typeof connectionHistory[0]) => {
    setReconnecting(entry.id);
    setReconnectError(null);
    try {
      await api.connections.add({
        id: entry.id, host: entry.host, port: entry.port,
        user: entry.user, password: entry.password, database: entry.database,
      });
      addConnection({
        id: entry.id, host: entry.host, port: entry.port,
        user: entry.user, database: entry.database,
      });
      addToHistory({ ...entry, lastUsedAt: new Date().toISOString() });
      setActiveConnection(entry.id, entry.database);
    } catch (err) {
      setReconnectError({ id: entry.id, msg: (err as Error).message });
    } finally {
      setReconnecting(null);
    }
  };

  const activeIds = new Set(connections.map(c => c.id));
  const availableHistory = connectionHistory.filter(h => !activeIds.has(h.id));

  return (
    <div className="p-3 flex flex-col h-full overflow-y-auto">
      {/* Active connections */}
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1" style={{ color: 'var(--text-muted)' }}>
          Active
        </h3>
        {connections.length > 0 ? (
          <ul className="space-y-1 mb-2.5">
            {connections.map(conn => (
              <li
                key={conn.id}
                onClick={() => handleSelect(conn.id, conn.database)}
                className="px-3 py-2 rounded-lg text-sm cursor-pointer transition-all group border"
                style={conn.id === activeConnectionId
                  ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                  : { background: 'transparent', borderColor: 'transparent', color: 'var(--text-primary)' }
                }
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium truncate">{conn.id}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(conn.id); }}
                    className="opacity-0 group-hover:opacity-100 text-xs transition-opacity flex-shrink-0 ml-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {conn.host}:{conn.port}/{conn.database}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs px-1 mb-2.5" style={{ color: 'var(--text-muted)' }}>No active connections</p>
        )}
        <ConnectionForm />
      </div>

      {/* Connection history */}
      {availableHistory.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
            Recent
          </h3>
          <ul className="space-y-1">
            {availableHistory.map(entry => (
              <li key={entry.id} className="group">
                <div
                  className="px-3 py-2 rounded-lg text-sm border transition-all cursor-pointer hover:opacity-80"
                  style={{ borderColor: 'var(--border)', background: 'transparent', color: 'var(--text-primary)' }}
                  onClick={() => handleReconnect(entry)}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium truncate flex items-center gap-1.5">
                      {reconnecting === entry.id ? (
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                      ) : (
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
                      )}
                      {entry.id}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); }}
                      className="opacity-0 group-hover:opacity-100 text-xs transition-opacity flex-shrink-0 ml-1"
                      style={{ color: 'var(--text-muted)' }}
                      title="Remove from history"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {entry.host}:{entry.port}/{entry.database}
                  </div>
                </div>
                {reconnectError?.id === entry.id && (
                  <p className="text-[11px] px-3 mt-0.5" style={{ color: '#ef4444' }}>{reconnectError.msg}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SchemaTree />
    </div>
  );
};
