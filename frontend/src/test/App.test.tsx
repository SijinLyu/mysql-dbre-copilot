import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from '../App';

vi.mock('../components/ChatPanel/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">ChatPanel</div>,
}));
vi.mock('../components/Audit/AuditPanel', () => ({
  AuditPanel: () => <div data-testid="audit-panel">AuditPanel</div>,
}));
vi.mock('../components/Diagnostics/IndexRedundancyPanel', () => ({
  IndexRedundancyPanel: () => <div data-testid="index-panel">IndexRedundancyPanel</div>,
}));
vi.mock('../components/Diagnostics/SlowQueryPanel', () => ({
  SlowQueryPanel: () => <div data-testid="slow-panel">SlowQueryPanel</div>,
}));
vi.mock('../components/Favorites/FavoritesView', () => ({
  FavoritesView: () => <div data-testid="favorites-panel">FavoritesView</div>,
}));
vi.mock('../components/Sidebar/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));
vi.mock('../components/Layout/Layout', () => ({
  Layout: ({ children, sidebar }: { children: React.ReactNode; sidebar: React.ReactNode }) => (
    <div data-testid="layout">{sidebar}{children}</div>
  ),
}));

import { useStore } from '../store';

describe('App', () => {
  it('renders chat view by default', () => {
    useStore.getState().setActiveView('chat');
    render(<App />);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('renders audit view', () => {
    useStore.getState().setActiveView('audit');
    render(<App />);
    expect(screen.getByTestId('audit-panel')).toBeInTheDocument();
  });

  it('renders index-redundancy view', () => {
    useStore.getState().setActiveView('index-redundancy');
    render(<App />);
    expect(screen.getByTestId('index-panel')).toBeInTheDocument();
  });

  it('renders slow-query view', () => {
    useStore.getState().setActiveView('slow-query');
    render(<App />);
    expect(screen.getByTestId('slow-panel')).toBeInTheDocument();
  });

  it('renders favorites view', () => {
    useStore.getState().setActiveView('favorites');
    render(<App />);
    expect(screen.getByTestId('favorites-panel')).toBeInTheDocument();
  });

  it('includes sidebar in layout', () => {
    useStore.getState().setActiveView('chat');
    render(<App />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('applies dark theme class', () => {
    useStore.getState().setActiveView('chat');
    const { container } = render(<App />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('theme-dark');
  });

  it('applies light theme class', () => {
    useStore.getState().toggleTheme();
    const current = useStore.getState().theme;
    if (current !== 'light') useStore.getState().toggleTheme();
    const { container } = render(<App />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('theme-light');
  });
});
