// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PenaltyHistory } from '@/components/household/PenaltyHistory';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space', role: 'owner' },
    spaces: [],
    loading: false,
  })),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Jan 1, 2026 10:00 AM'),
  formatDistanceToNow: vi.fn(() => '2 days'),
}));

describe('PenaltyHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ penalties: [] }),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<PenaltyHistory />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading state initially', () => {
    render(<PenaltyHistory />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows Penalty History heading after loading', async () => {
    render(<PenaltyHistory />);
    await waitFor(() => {
      expect(screen.getByText('Penalty History')).toBeTruthy();
    });
  });

  it('shows empty state with no penalties', async () => {
    render(<PenaltyHistory />);
    await waitFor(() => {
      expect(screen.getByText('No penalties')).toBeTruthy();
    });
  });

  it('shows "Everyone is completing chores on time!" in empty state', async () => {
    render(<PenaltyHistory />);
    await waitFor(() => {
      expect(screen.getByText("Everyone is completing chores on time!")).toBeTruthy();
    });
  });

  it('shows "0 penalties" in the header', async () => {
    render(<PenaltyHistory />);
    await waitFor(() => {
      expect(screen.getByText('0 penalties')).toBeTruthy();
    });
  });

  it('renders with a userId filter prop', () => {
    const { container } = render(<PenaltyHistory userId="user-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders with a limit prop', () => {
    const { container } = render(<PenaltyHistory limit={10} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays penalties when they exist', async () => {
    const mockPenalties = [
      {
        id: 'penalty-1',
        user_id: 'user-1',
        chore_id: 'chore-1',
        space_id: 'space-1',
        points_deducted: 10,
        days_late: 2,
        is_forgiven: false,
        due_date: '2026-02-20T00:00:00Z',
        completion_date: '2026-02-22T00:00:00Z',
        created_at: '2026-02-22T00:00:00Z',
        forgiven_reason: null,
      },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ penalties: mockPenalties }),
    });

    render(<PenaltyHistory />);
    await waitFor(() => {
      expect(screen.getByText('1 penalty')).toBeTruthy();
    });
  });
});
