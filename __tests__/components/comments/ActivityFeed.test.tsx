// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/services/comments-service', () => ({
  getActivityFeed: vi.fn().mockResolvedValue([]),
  getActivityStats: vi.fn().mockResolvedValue({
    total_activities: 0,
    by_type: {},
    top_contributors: [],
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('date-fns', async () => {
  const actual = await vi.importActual<typeof import('date-fns')>('date-fns');
  return {
    ...actual,
    formatDistanceToNow: vi.fn(() => '5 minutes ago'),
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ActivityFeed from '@/components/comments/ActivityFeed';
import { getActivityFeed, getActivityStats } from '@/lib/services/comments-service';

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActivityFeed).mockResolvedValue([]);
    vi.mocked(getActivityStats).mockResolvedValue({
      total_activities: 0,
      by_type: {},
      top_contributors: [],
    });
  });

  it('renders without crashing', async () => {
    render(<ActivityFeed spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  it('shows loading spinner initially', () => {
    // Keep the promise pending so loading spinner stays visible
    vi.mocked(getActivityFeed).mockReturnValueOnce(new Promise(() => {}));

    render(<ActivityFeed spaceId="space-1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no activities', async () => {
    render(<ActivityFeed spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  it('renders activities when data is loaded', async () => {
    vi.mocked(getActivityFeed).mockResolvedValueOnce([
      {
        id: 'act-1',
        space_id: 'space-1',
        user_id: 'user-1',
        user_email: 'user@example.com',
        activity_type: 'created',
        entity_type: 'task',
        entity_id: 'task-1',
        description: 'created a task',
        metadata: {},
        is_system: false,
        created_at: new Date().toISOString(),
      },
    ]);

    render(<ActivityFeed spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('created a task')).toBeInTheDocument();
    });
  });

  it('shows stats section when showStats is true', async () => {
    vi.mocked(getActivityStats).mockResolvedValueOnce({
      total_activities: 42,
      by_type: { commented: 10, updated: 5 },
      top_contributors: ['user@example.com'],
    });

    render(<ActivityFeed spaceId="space-1" showStats={true} />);
    await waitFor(() => {
      expect(screen.getByText('Activity Stats (Last 30 Days)')).toBeInTheDocument();
    });
  });

  it('does not show stats when showStats is false', async () => {
    render(<ActivityFeed spaceId="space-1" showStats={false} />);
    await waitFor(() => {
      expect(screen.queryByText('Activity Stats (Last 30 Days)')).not.toBeInTheDocument();
    });
  });

  it('shows error state when loading fails', async () => {
    vi.mocked(getActivityFeed).mockRejectedValueOnce(new Error('Network error'));

    render(<ActivityFeed spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
    });
  });

  it('renders system badge for system activities', async () => {
    vi.mocked(getActivityFeed).mockResolvedValueOnce([
      {
        id: 'act-1',
        space_id: 'space-1',
        user_id: 'system',
        user_email: null,
        activity_type: 'status_changed',
        entity_type: 'task',
        entity_id: 'task-1',
        description: 'status changed to completed',
        metadata: {},
        is_system: true,
        created_at: new Date().toISOString(),
      },
    ]);

    render(<ActivityFeed spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('System')).toBeInTheDocument();
    });
  });
});
