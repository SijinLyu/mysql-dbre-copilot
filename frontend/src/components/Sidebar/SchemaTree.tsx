import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { api } from '../../services/api';
import { TableMeta } from '../../types';

export const SchemaTree: React.FC = () => {
  const { activeConnectionId, activeDatabase } = useStore();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeConnectionId && activeDatabase) {
      loadSchema();
    }
  }, [activeConnectionId, activeDatabase]);

  const loadSchema = async () => {
    if (!activeConnectionId || !activeDatabase) return;
    setLoading(true);
    try {
      const schema = await api.schema.get(activeConnectionId, activeDatabase);
      setTables(schema.tables || []);
    } catch {
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (name: string) => {
    const next = new Set(expanded);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpanded(next);
  };

  if (!activeConnectionId) return null;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">
        Schema
      </h3>
      {loading ? (
        <p className="text-xs text-slate-500 px-4">Loading...</p>
      ) : tables.length === 0 ? (
        <p className="text-xs text-slate-500 px-4">No tables found</p>
      ) : (
        <ul className="space-y-0.5">
          {tables.map(table => (
            <li key={table.name}>
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full px-4 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2"
              >
                <span className="text-xs text-slate-500">{expanded.has(table.name) ? '▼' : '▶'}</span>
                <span>{table.name}</span>
                <span className="text-xs text-slate-600 ml-auto">~{table.rowEstimate}</span>
              </button>
              {expanded.has(table.name) && (
                <ul className="pl-8 py-1">
                  {table.columns.map(col => (
                    <li key={col.name} className="text-xs text-slate-500 py-0.5 flex items-center gap-2">
                      {col.isPrimaryKey && <span className="text-yellow-500">🔑</span>}
                      <span className="text-slate-400">{col.name}</span>
                      <span className="text-slate-600">{col.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
