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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-96 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-medium text-white mb-4">Save Query</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Top selling products"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500"
            />
          </div>
          <div className="bg-slate-900 rounded-lg p-2 border border-slate-700">
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{sql}</pre>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
