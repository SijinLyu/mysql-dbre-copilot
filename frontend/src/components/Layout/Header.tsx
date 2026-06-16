import React from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-white">MySQL DBRE Copilot</h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="px-2 py-1 bg-slate-700 rounded text-xs">AI-Powered</span>
      </div>
    </header>
  );
};
