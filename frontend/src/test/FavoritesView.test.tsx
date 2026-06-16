import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FavoritesView } from '../components/Favorites/FavoritesView';

const mockRemoveFavorite = vi.fn();
const mockSetActiveView = vi.fn();

vi.mock('../store', () => ({
  useStore: vi.fn(() => ({
    favorites: [],
    removeFavorite: mockRemoveFavorite,
    setActiveView: mockSetActiveView,
  })),
}));

import { useStore } from '../store';

const mockFavorites = [
  {
    id: 'f1',
    name: 'User count',
    description: 'Count all users',
    sql: 'SELECT COUNT(*) FROM users',
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'f2',
    name: 'Active orders',
    sql: 'SELECT * FROM orders WHERE status = \'active\'',
    createdAt: '2026-06-02T00:00:00Z',
  },
];

describe('FavoritesView', () => {
  beforeEach(() => {
    mockRemoveFavorite.mockReset();
    mockSetActiveView.mockReset();
  });

  it('renders title', () => {
    render(<FavoritesView />);
    expect(screen.getByText('Saved Queries')).toBeInTheDocument();
  });

  it('shows empty state when no favorites', () => {
    render(<FavoritesView />);
    expect(screen.getByText('No saved queries yet.')).toBeInTheDocument();
  });

  it('shows link to chat view in empty state', () => {
    render(<FavoritesView />);
    const chatLink = screen.getByText('chat');
    fireEvent.click(chatLink);
    expect(mockSetActiveView).toHaveBeenCalledWith('chat');
  });

  it('renders favorites list', () => {
    vi.mocked(useStore).mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
      setActiveView: mockSetActiveView,
    });
    render(<FavoritesView />);
    expect(screen.getByText('User count')).toBeInTheDocument();
    expect(screen.getByText('Active orders')).toBeInTheDocument();
  });

  it('shows SQL code for each favorite', () => {
    vi.mocked(useStore).mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
      setActiveView: mockSetActiveView,
    });
    render(<FavoritesView />);
    expect(screen.getByText('SELECT COUNT(*) FROM users')).toBeInTheDocument();
  });

  it('shows description when available', () => {
    vi.mocked(useStore).mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
      setActiveView: mockSetActiveView,
    });
    render(<FavoritesView />);
    expect(screen.getByText('Count all users')).toBeInTheDocument();
  });

  it('calls removeFavorite when Remove clicked', () => {
    vi.mocked(useStore).mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
      setActiveView: mockSetActiveView,
    });
    render(<FavoritesView />);
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    expect(mockRemoveFavorite).toHaveBeenCalledWith('f1');
  });

  it('copies SQL to clipboard on Copy click', async () => {
    vi.mocked(useStore).mockReturnValue({
      favorites: mockFavorites,
      removeFavorite: mockRemoveFavorite,
      setActiveView: mockSetActiveView,
    });
    render(<FavoritesView />);
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SELECT COUNT(*) FROM users');
  });
});
