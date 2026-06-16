import React from 'react';
import { useStore } from '../../store';
import { ConnectionForm } from './ConnectionForm';
import { SchemaTree } from './SchemaTree';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const { connections, activeConnectionId, setActiveConnection, removeConnection } = useStore();

  const handleSelect = (id: string, database: string) => setActiveConnection(id, database);

  const handleRemove = async (id: string) => {
    try {
      await api.connections.remove(id);
      removeConnection(id);
    } catch (err) {
      console.error('Failed to remove connection:', err);
    }
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 px-1" style={{ color: 'var(--text-muted)' }}>
          Connections
        </h3>
        {connections.length > 0 && (
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
                  <div className="font-medium">{conn.id}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(conn.id); }}
                    className="opacity-0 group-hover:opacity-100 text-xs transition-opacity"
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
        )}
        <ConnectionForm />
      </div>
      <SchemaTree />
    </div>
  );
};
