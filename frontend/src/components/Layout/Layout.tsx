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
    <div className="h-screen flex flex-col">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <aside className="w-72 bg-slate-800 border-r border-slate-700 overflow-y-auto">
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
