import React from 'react';
import { useStore } from '../../store';
import { Favorite } from '../../types';

interface FavoritesPanelProps {
  onUseFavorite: (sql: string) => void;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ onUseFavorite }) => {
  const { favorites, removeFavorite } = useStore();

  if (favorites.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        No saved queries yet. Star a query result to save it here.
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
      {favorites.map(fav => (
        <div
          key={fav.id}
          className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group"
        >
          <div className="flex justify-between items-start">
            <button
              onClick={() => onUseFavorite(fav.sql)}
              className="text-left flex-1"
            >
              <div className="text-sm text-slate-200 font-medium">{fav.name}</div>
              {fav.description && (
                <div className="text-xs text-slate-500 mt-0.5">{fav.description}</div>
              )}
              <div className="text-xs text-slate-600 font-mono mt-1 truncate">{fav.sql}</div>
            </button>
            <button
              onClick={() => removeFavorite(fav.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
