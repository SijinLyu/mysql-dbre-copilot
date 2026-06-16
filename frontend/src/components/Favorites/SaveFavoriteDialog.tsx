import React, { useState } from 'react';
import { useStore } from '../../store';

interface SaveFavoriteDialogProps {
  sql: string;
  onClose: () => void;
}

export const SaveFavoriteDialog: React.FC<SaveFavoriteDialogProps> = ({ sql, onClose }) => {
  const { addFavorite, activeConnectionId, activeDatabase } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    addFavorite({
      id: crypto.randomUUID(),
      name: name.trim(),
      sql,
      description: description.trim() || undefined,
      connectionId: activeConnectionId || '',
      database: activeDatabase || '',
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  const inputStyle = {
    background: 'var(--bg-base)', color: 'var(--text-primary)', borderColor: 'var(--border)',
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="rounded-2xl p-5 w-96 shadow-2xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Save Query</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Top selling products" autoFocus
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..."
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="rounded-lg p-2 border" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
            <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{sql}</pre>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim()}
              className="px-4 py-2 text-sm rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--accent)' }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
