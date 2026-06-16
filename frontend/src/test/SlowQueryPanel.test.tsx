import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SlowQueryPanel } from '../components/Diagnostics/SlowQueryPanel';

vi.mock('../services/api', () => ({
  api: {
    diagnostics: {
      parseSlowLog: vi.fn(),
    },
  },
}));

import { api } from '../services/api';

const mockResult = {
  stats: {
    totalQueries: 2,
    avgQueryTimeMs: 3812,
    maxQueryTimeMs: 5123,
    totalRowsExamined: 150000,
    topSlowQueries: [
      {
        timestamp: '2026-06-15T10:30:00Z',
        user: 'app',
        host: 'localhost',
        queryTimeMs: 5123.456,
        lockTimeMs: 0.123,
        rowsSent: 1,
        rowsExamined: 100000,
        database: 'demo',
        sql: 'SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers)',
      },
      {
        timestamp: '2026-06-15T10:31:00Z',
        user: 'app',
        host: 'localhost',
        queryTimeMs: 2500.0,
        lockTimeMs: 0.05,
        rowsSent: 50,
        rowsExamined: 50000,
        database: 'demo',
        sql: 'SELECT COUNT(*) FROM order_items WHERE created_at > \'2026-01-01\'',
      },
    ],
    byUser: { app: 2 },
    byDatabase: { demo: 2 },
  },
  fingerprints: [
    {
      fingerprint: 'SELECT * FROM orders WHERE customer_id IN (?)',
      count: 1,
      totalTimeMs: 5123,
      avgTimeMs: 5123,
      maxTimeMs: 5123,
      sample: 'SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers)',
    },
  ],
};

describe('SlowQueryPanel', () => {
  beforeEach(() => {
    vi.mocked(api.diagnostics.parseSlowLog).mockReset();
  });

  it('renders title and controls', () => {
    render(<SlowQueryPanel />);
    expect(screen.getByText('Slow Query Analysis')).toBeInTheDocument();
    expect(screen.getByText('Use sample')).toBeInTheDocument();
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  it('shows textarea for log input', () => {
    render(<SlowQueryPanel />);
    const textarea = screen.getByPlaceholderText(/Paste slow query log/);
    expect(textarea).toBeInTheDocument();
  });

  it('loads sample content on button click', () => {
    render(<SlowQueryPanel />);
    fireEvent.click(screen.getByText('Use sample'));
    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    expect(textarea.value).toContain('Query_time');
  });

  it('shows error if analyze clicked with empty content', async () => {
    render(<SlowQueryPanel />);
    fireEvent.click(screen.getByText('Analyze'));
    expect(screen.getByText(/Paste or upload slow log content first/)).toBeInTheDocument();
  });

  it('analyzes and shows stats', async () => {
    vi.mocked(api.diagnostics.parseSlowLog).mockResolvedValueOnce(mockResult);
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '# Time: ...\n# Query_time: 5' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText('Total Queries')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows top slow queries tab by default', async () => {
    vi.mocked(api.diagnostics.parseSlowLog).mockResolvedValueOnce(mockResult);
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'log data' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText(/5123.46/)).toBeInTheDocument();
    });
  });

  it('switches to fingerprints tab', async () => {
    vi.mocked(api.diagnostics.parseSlowLog).mockResolvedValueOnce(mockResult);
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'log data' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText(/Fingerprints/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Fingerprints/));

    await waitFor(() => {
      expect(screen.getByText(/1× · total 5123ms/)).toBeInTheDocument();
    });
  });

  it('switches to breakdown tab', async () => {
    vi.mocked(api.diagnostics.parseSlowLog).mockResolvedValueOnce(mockResult);
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'log data' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText('Breakdown')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Breakdown'));

    await waitFor(() => {
      expect(screen.getByText('By User')).toBeInTheDocument();
      expect(screen.getByText('By Database')).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    vi.mocked(api.diagnostics.parseSlowLog).mockRejectedValueOnce(new Error('Parse failed'));
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'bad data' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText('Parse failed')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    let resolve: (v: unknown) => void;
    vi.mocked(api.diagnostics.parseSlowLog).mockReturnValueOnce(
      new Promise(r => { resolve = r; }),
    );
    render(<SlowQueryPanel />);

    const textarea = screen.getByPlaceholderText(/Paste slow query log/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'data' } });
    fireEvent.click(screen.getByText('Analyze'));

    expect(screen.getByText('Parsing…')).toBeInTheDocument();
    resolve!(mockResult);
    await waitFor(() => {
      expect(screen.queryByText('Parsing…')).not.toBeInTheDocument();
    });
  });
});
