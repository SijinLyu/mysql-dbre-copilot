import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { IndexRedundancyPanel } from '../components/Diagnostics/IndexRedundancyPanel';

vi.mock('../services/api', () => ({
  api: {
    diagnostics: {
      indexRedundancy: vi.fn(),
    },
  },
}));

vi.mock('../store', () => ({
  useStore: vi.fn(() => ({
    activeConnectionId: 'conn1',
    activeDatabase: 'demo',
  })),
}));

import { api } from '../services/api';
import { useStore } from '../store';

const mockReport = {
  database: 'demo',
  tableCount: 10,
  totalIssues: 3,
  redundant: [
    {
      table: 'orders',
      redundantIndex: 'idx_customer',
      coveredBy: 'idx_customer_date',
      reason: 'Prefix of idx_customer_date',
      dropStatement: 'ALTER TABLE orders DROP INDEX idx_customer;',
    },
  ],
  duplicates: [
    {
      table: 'users',
      indexA: 'idx_email',
      indexB: 'idx_email_2',
      columns: ['email'],
      reason: 'Identical column list',
    },
  ],
  potentiallyUnused: [
    {
      table: 'logs',
      index: 'idx_old_ts',
      reason: 'Zero reads in last 7 days',
    },
  ],
};

describe('IndexRedundancyPanel', () => {
  beforeEach(() => {
    vi.mocked(api.diagnostics.indexRedundancy).mockReset();
  });

  it('renders title and run button', () => {
    render(<IndexRedundancyPanel />);
    expect(screen.getByText('Index Redundancy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Analysis' })).toBeInTheDocument();
  });

  it('shows initial empty state', () => {
    render(<IndexRedundancyPanel />);
    expect(screen.getByText(/No analysis yet/)).toBeInTheDocument();
  });

  it('runs analysis and displays report', async () => {
    vi.mocked(api.diagnostics.indexRedundancy).mockResolvedValueOnce(mockReport);
    render(<IndexRedundancyPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getByText('Tables Scanned')).toBeInTheDocument();
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays redundant index details', async () => {
    vi.mocked(api.diagnostics.indexRedundancy).mockResolvedValueOnce(mockReport);
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getByText('orders.idx_customer')).toBeInTheDocument();
    });
    expect(screen.getByText(/covered by idx_customer_date/)).toBeInTheDocument();
    expect(screen.getByText(/ALTER TABLE orders DROP INDEX/)).toBeInTheDocument();
  });

  it('displays duplicate indexes', async () => {
    vi.mocked(api.diagnostics.indexRedundancy).mockResolvedValueOnce(mockReport);
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getByText(/idx_email ⇄ idx_email_2/)).toBeInTheDocument();
    });
    expect(screen.getByText('Identical column list')).toBeInTheDocument();
  });

  it('displays potentially unused indexes', async () => {
    vi.mocked(api.diagnostics.indexRedundancy).mockResolvedValueOnce(mockReport);
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getByText('logs.idx_old_ts')).toBeInTheDocument();
    });
    expect(screen.getByText('Zero reads in last 7 days')).toBeInTheDocument();
  });

  it('shows error when no connection', () => {
    vi.mocked(useStore).mockReturnValue({
      activeConnectionId: null,
      activeDatabase: null,
    });
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));
    expect(screen.getByText('Connect to a database first.')).toBeInTheDocument();
  });

  it('shows API error message', async () => {
    vi.mocked(useStore).mockReturnValue({
      activeConnectionId: 'conn1',
      activeDatabase: 'demo',
    });
    vi.mocked(api.diagnostics.indexRedundancy).mockRejectedValueOnce(new Error('Timeout'));
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument();
    });
  });

  it('shows loading state while running', async () => {
    let resolve: (v: unknown) => void;
    vi.mocked(api.diagnostics.indexRedundancy).mockReturnValueOnce(
      new Promise(r => { resolve = r; }),
    );
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    expect(screen.getByText('Analyzing…')).toBeInTheDocument();
    resolve!(mockReport);
    await waitFor(() => {
      expect(screen.queryByText('Analyzing…')).not.toBeInTheDocument();
    });
  });

  it('shows no issues detected when arrays are empty', async () => {
    vi.mocked(api.diagnostics.indexRedundancy).mockResolvedValueOnce({
      ...mockReport,
      totalIssues: 0,
      redundant: [],
      duplicates: [],
      potentiallyUnused: [],
    });
    render(<IndexRedundancyPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Run Analysis' }));

    await waitFor(() => {
      expect(screen.getAllByText('No issues detected.')).toHaveLength(3);
    });
  });
});
