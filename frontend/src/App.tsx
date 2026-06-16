import React from 'react';
import { Layout } from './components/Layout/Layout';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { AuditPanel } from './components/Audit/AuditPanel';
import { IndexRedundancyPanel } from './components/Diagnostics/IndexRedundancyPanel';
import { SlowQueryPanel } from './components/Diagnostics/SlowQueryPanel';
import { FavoritesView } from './components/Favorites/FavoritesView';
import { useStore } from './store';

const App: React.FC = () => {
  const { theme, activeView } = useStore();

  let view: React.ReactNode;
  switch (activeView) {
    case 'audit':
      view = <AuditPanel />;
      break;
    case 'index-redundancy':
      view = <IndexRedundancyPanel />;
      break;
    case 'slow-query':
      view = <SlowQueryPanel />;
      break;
    case 'favorites':
      view = <FavoritesView />;
      break;
    case 'chat':
    default:
      view = <ChatPanel />;
  }

  return (
    <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'}>
      <Layout sidebar={<Sidebar />}>{view}</Layout>
    </div>
  );
};

export default App;
