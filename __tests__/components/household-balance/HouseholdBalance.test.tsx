// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useHouseholdBalance', () => ({
  useHouseholdBalance: vi.fn(() => ({
    data: null,
    loading: true,
    timeframe: 'week' as const,
    setTimeframe: vi.fn(),
  })),
}));

import { HouseholdBalance } from '@/components/household-balance/HouseholdBalance';

const defaultProps = {
  spaceId: 'space-1',
  userId: 'user-1',
};

describe('HouseholdBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<HouseholdBalance {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows loading skeleton initially', () => {
    render(<HouseholdBalance {...defaultProps} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with data and shows household balance header', async () => {
    const { useHouseholdBalance } = await import('@/lib/hooks/useHouseholdBalance');
    (useHouseholdBalance as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: {
        members: [
          {
            memberId: 'user-1',
            memberName: 'Alice',
            totalCompleted: 5,
            percentage: 60,
            isCurrentUser: true,
            memberColor: '#14b8a6',
          },
          {
            memberId: 'user-2',
            memberName: 'Bob',
            totalCompleted: 3,
            percentage: 40,
            isCurrentUser: false,
            memberColor: '#8b5cf6',
          },
        ],
        totalCompletions: 8,
        balanceStatus: 'balanced' as const,
        balanceScore: 80,
      },
      loading: false,
      timeframe: 'week' as const,
      setTimeframe: vi.fn(),
    });

    render(<HouseholdBalance {...defaultProps} />);
    expect(screen.getByText('Household Balance')).toBeTruthy();
  });

  it('renders Week and Month toggle buttons when data is loaded', async () => {
    const { useHouseholdBalance } = await import('@/lib/hooks/useHouseholdBalance');
    (useHouseholdBalance as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: {
        members: [
          {
            memberId: 'user-1',
            memberName: 'Alice',
            totalCompleted: 5,
            percentage: 100,
            isCurrentUser: true,
            memberColor: '#14b8a6',
          },
        ],
        totalCompletions: 5,
        balanceStatus: 'balanced' as const,
        balanceScore: 100,
      },
      loading: false,
      timeframe: 'week' as const,
      setTimeframe: vi.fn(),
    });

    render(<HouseholdBalance {...defaultProps} />);
    expect(screen.getByText('Week')).toBeTruthy();
    expect(screen.getByText('Month')).toBeTruthy();
  });

  it('shows empty state when no completions', async () => {
    const { useHouseholdBalance } = await import('@/lib/hooks/useHouseholdBalance');
    (useHouseholdBalance as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: {
        members: [],
        totalCompletions: 0,
        balanceStatus: 'balanced' as const,
        balanceScore: 0,
      },
      loading: false,
      timeframe: 'week' as const,
      setTimeframe: vi.fn(),
    });

    render(<HouseholdBalance {...defaultProps} />);
    expect(screen.getByText(/Complete some tasks together/)).toBeTruthy();
  });

  it('shows member names when data is loaded', async () => {
    const { useHouseholdBalance } = await import('@/lib/hooks/useHouseholdBalance');
    (useHouseholdBalance as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: {
        members: [
          {
            memberId: 'user-1',
            memberName: 'Alice',
            totalCompleted: 5,
            percentage: 60,
            isCurrentUser: true,
            memberColor: '#14b8a6',
          },
        ],
        totalCompletions: 5,
        balanceStatus: 'balanced' as const,
        balanceScore: 80,
      },
      loading: false,
      timeframe: 'week' as const,
      setTimeframe: vi.fn(),
    });

    render(<HouseholdBalance {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });

  it('shows "Nicely Balanced" pill for balanced status', async () => {
    const { useHouseholdBalance } = await import('@/lib/hooks/useHouseholdBalance');
    (useHouseholdBalance as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: {
        members: [
          {
            memberId: 'user-1',
            memberName: 'Alice',
            totalCompleted: 5,
            percentage: 50,
            isCurrentUser: true,
            memberColor: '#14b8a6',
          },
          {
            memberId: 'user-2',
            memberName: 'Bob',
            totalCompleted: 5,
            percentage: 50,
            isCurrentUser: false,
            memberColor: '#8b5cf6',
          },
        ],
        totalCompletions: 10,
        balanceStatus: 'balanced' as const,
        balanceScore: 100,
      },
      loading: false,
      timeframe: 'week' as const,
      setTimeframe: vi.fn(),
    });

    render(<HouseholdBalance {...defaultProps} />);
    expect(screen.getByText('Nicely Balanced')).toBeTruthy();
  });
});
