import React from 'react';
import { Layout } from './components/Layout/Layout';
import { ChatPanel } from './components/ChatPanel/ChatPanel';
import { Sidebar } from './components/Sidebar/Sidebar';

const App: React.FC = () => {
  return (
    <Layout sidebar={<Sidebar />}>
      <ChatPanel />
    </Layout>
  );
};

export default App;
