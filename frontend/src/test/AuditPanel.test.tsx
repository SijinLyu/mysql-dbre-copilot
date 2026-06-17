import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuditPanel } from '../components/Audit/AuditPanel';

vi.mock('../services/api', () => ({
  api: {
    audit: {
      list: vi.fn(),
      stats: vi.fn(),
    },
  },
}));

import { api } from '../services/api';

const mockEntries = [
  {
    id: 'a1',
    sessionId: 's1',
    connectionId: 'c1',
    database: 'demo',
    timestamp: '2026-06-15T10:00:00Z',
    userMessage: 'Show all users',
    generatedSql: 'SELECT * FROM users',
    riskLevel: 'low',
    riskScore: 10,
    executed: true,
    executionTimeMs: 45,
    rowCount: 100,
    error: null,
  },
  {
    id: 'a2',
    sessionId: 's1',
    connectionId: 'c1',
    database: 'demo',
    timestamp: '2026-06-15T11:00:00Z',
    userMessage: 'Drop table',
    generatedSql: 'DROP TABLE users',
    riskLevel: 'critical',
    riskScore: 95,
    executed: false,
    executionTimeMs: null,
    rowCount: null,
    error: null,
  },
];

const mockStats = {
  total: 2,
  byRisk: { low: 1, medium: 0, high: 0, critical: 1 },
  avgScore: 52.5,
};

describe('AuditPanel', () => {
  beforeEach(() => {
    vi.mocked(api.audit.list).mockResolvedValue({ entries: mockEntries });
    vi.mocked(api.audit.stats).mockResolvedValue(mockStats);
  });

  it('renders title and description', async () => {
    render(<AuditPanel />);
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText(/Every chat-to-SQL interaction/)).toBeInTheDocument();
  });

  it('loads and displays audit entries', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Show all users')).toBeInTheDocument();
    });
    expect(screen.getByText('DROP TABLE users')).toBeInTheDocument();
  });

  it('shows stats cards', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('52.5')).toBeInTheDocument();
  });

  it('renders risk filter buttons', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
    const filterButtons = screen.getAllByRole('button');
    const filterLabels = filterButtons.map(b => b.textContent);
    expect(filterLabels).toContain('LOW');
    expect(filterLabels).toContain('MEDIUM');
    expect(filterLabels).toContain('HIGH');
    expect(filterLabels).toContain('CRITICAL');
  });

  it('clicking a risk filter reloads data', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(api.audit.list).toHaveBeenCalled();
    });

    vi.mocked(api.audit.list).mockResolvedValue({ entries: mockEntries });
    vi.mocked(api.audit.stats).mockResolvedValue(mockStats);
    vi.mocked(api.audit.list).mockClear();
    const highBtn = screen.getByRole('button', { name: 'HIGH' });
    fireEvent.click(highBtn);

    await waitFor(() => {
      expect(api.audit.list).toHaveBeenCalledWith(
        expect.objectContaining({ riskLevel: 'high' }),
      );
    });
  });

  it('shows detail panel when entry is clicked', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Show all users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show all users'));
    await waitFor(() => {
      expect(screen.getByText('Entry detail')).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    vi.mocked(api.audit.list).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(api.audit.stats).mockRejectedValueOnce(new Error('Network error'));
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('refresh button triggers reload', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(api.audit.list).toHaveBeenCalled();
    });

    vi.mocked(api.audit.list).mockClear();
    vi.mocked(api.audit.stats).mockClear();
    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(api.audit.list).toHaveBeenCalled();
      expect(api.audit.stats).toHaveBeenCalled();
    });
  });

  it('shows empty state when no entries', async () => {
    vi.mocked(api.audit.list).mockResolvedValueOnce({ entries: [] });
    vi.mocked(api.audit.stats).mockResolvedValueOnce({ total: 0, byRisk: {}, avgScore: 0 });
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('No audit entries yet.')).toBeInTheDocument();
    });
  });

  it('renders Export CSV button', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
  });

  it('Export CSV button is disabled when no entries', async () => {
    vi.mocked(api.audit.list).mockResolvedValueOnce({ entries: [] });
    vi.mocked(api.audit.stats).mockResolvedValueOnce({ total: 0, byRisk: {}, avgScore: 0 });
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
    const btn = screen.getByText('Export CSV');
    expect(btn).toBeDisabled();
  });

  it('Export CSV button is enabled when entries exist', async () => {
    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Show all users')).toBeInTheDocument();
    });
    const btn = screen.getByText('Export CSV');
    expect(btn).not.toBeDisabled();
  });

  it('Export CSV generates and triggers download', async () => {
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
    const mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    render(<AuditPanel />);
    await waitFor(() => {
      expect(screen.getByText('Show all users')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export CSV'));

    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
