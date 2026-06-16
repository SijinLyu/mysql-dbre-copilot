import React from 'react';
import { useStore } from '../../store';

export const Sidebar: React.FC = () => {
  const { connections, activeConnectionId, activeDatabase } = useStore();

  return (
    <div className="p-4">
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Connections
        </h3>
        {connections.length === 0 ? (
          <p className="text-sm text-slate-500">No connections yet</p>
        ) : (
          <ul className="space-y-1">
            {connections.map(conn => (
              <li
                key={conn.id}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  conn.id === activeConnectionId
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-600/30'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="font-medium">{conn.id}</div>
                <div className="text-xs text-slate-500">{conn.host}:{conn.port}/{conn.database}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeConnectionId && activeDatabase && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Active
          </h3>
          <div className="px-3 py-2 bg-slate-700/50 rounded-lg text-sm">
            <div className="text-green-400 text-xs">Connected</div>
            <div className="text-slate-200">{activeConnectionId}</div>
            <div className="text-xs text-slate-500">{activeDatabase}</div>
          </div>
        </div>
      )}
    </div>
  );
};
