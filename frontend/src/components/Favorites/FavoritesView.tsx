import React, { useState } from 'react';
import { useStore } from '../../store';

export const FavoritesView: React.FC = () => {
  const { favorites, removeFavorite, setActiveView } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Saved Queries</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Re-run useful queries from chat without retyping. Click Copy to grab the SQL.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">No saved queries yet.</p>
            <p className="text-xs mt-2">
              Open the <button
                onClick={() => setActiveView('chat')}
                className="underline"
                style={{ color: 'var(--accent)' }}
              >chat</button> view, run a query, and use the star button on the result to save it here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3">
          {favorites.map(fav => (
            <div
              key={fav.id}
              className="rounded-lg border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {fav.name}
                  </h3>
                  {fav.description && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fav.description}</p>
                  )}
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Saved {new Date(fav.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 ml-3 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(fav.id, fav.sql)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {copiedId === fav.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.id)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium transition-all border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <pre
                className="text-xs font-mono p-3 rounded overflow-x-auto whitespace-pre-wrap break-words"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >{fav.sql}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
