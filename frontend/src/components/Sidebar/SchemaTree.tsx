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
    if (activeConnectionId && activeDatabase) loadSchema();
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
    <div className="mt-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
        Schema
      </h3>
      {loading ? (
        <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : tables.length === 0 ? (
        <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No tables found</p>
      ) : (
        <ul className="space-y-0.5">
          {tables.map(table => (
            <li key={table.name}>
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full px-2 py-1.5 text-left text-sm rounded-md flex items-center gap-2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{expanded.has(table.name) ? '▼' : '▶'}</span>
                <span className="flex-1 truncate">{table.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>~{table.rowEstimate}</span>
              </button>
              {expanded.has(table.name) && (
                <ul className="pl-6 py-1">
                  {table.columns.map(col => (
                    <li key={col.name} className="text-[11px] py-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {col.isPrimaryKey && <span style={{ color: '#eab308' }}>🔑</span>}
                      <span>{col.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{col.type}</span>
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
