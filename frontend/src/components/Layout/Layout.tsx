import React from 'react';
import { Header } from './Header';
import { useStore } from '../../store';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, children }) => {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-64 border-r overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            {sidebar}
          </aside>
        )}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
