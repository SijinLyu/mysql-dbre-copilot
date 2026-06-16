import React from 'react';
import { useStore } from '../../store';
import { ConnectionForm } from './ConnectionForm';
import { SchemaTree } from './SchemaTree';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const { connections, activeConnectionId, activeDatabase, setActiveConnection, removeConnection } = useStore();

  const handleSelect = (id: string, database: string) => {
    setActiveConnection(id, database);
  };

  const handleRemove = async (id: string) => {
    try {
      await api.connections.remove(id);
      removeConnection(id);
    } catch (err) {
      console.error('Failed to remove connection:', err);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Connections
        </h3>
        {connections.length > 0 && (
          <ul className="space-y-1 mb-3">
            {connections.map(conn => (
              <li
                key={conn.id}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors group ${
                  conn.id === activeConnectionId
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-600/30'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => handleSelect(conn.id, conn.database)}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium">{conn.id}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(conn.id); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-xs text-slate-500">{conn.host}:{conn.port}/{conn.database}</div>
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
