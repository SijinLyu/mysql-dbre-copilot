import React from 'react';
import { Layout } from './components/Layout/Layout';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useStore } from './store';

const App: React.FC = () => {
  const { theme } = useStore();

  return (
    <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'}>
      <Layout sidebar={<Sidebar />}>
        <ChatPanel />
      </Layout>
    </div>
  );
};

export default App;
