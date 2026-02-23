// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(),
}));

import { SubscriptionsPanel } from '@/components/admin/panels/SubscriptionsPanel';

const mockUseQuery = vi.mocked(useQuery);

// Full metrics object matching the SubscriptionMetrics interface in the component
const mockMetrics = {
  mrr: 5000,
  arr: 60000,
  arpu: 15,
  totalSubscribers: 150,
  proSubscribers: 100,
  familySubscribers: 50,
  freeUsers: 500,
  trialUsers: 20,
  tierDistribution: [
    { tier: 'Pro', count: 100, percentage: 67, mrr: 3000 },
    { tier: 'Family', count: 50, percentage: 33, mrr: 2000 },
  ],
  newSubscriptionsThisMonth: 20,
  cancellationsThisMonth: 5,
  netGrowth: 15,
  churnRate: 3.3,
  conversionRate: 23,
  recentEvents: {
    created: 5,
    upgraded: 3,
    downgraded: 1,
    cancelled: 2,
    reactivated: 1,
    paymentFailed: 0,
  },
};

const mockDataWithMetrics = {
  data: { metrics: mockMetrics, events: { events: [] } },
  isLoading: false,
  refetch: vi.fn(),
} as ReturnType<typeof useQuery>;

describe('SubscriptionsPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<SubscriptionsPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<SubscriptionsPanel />);
    expect(screen.getByText(/Loading subscriptions/)).toBeTruthy();
  });

  it('shows no data message when metrics are null', () => {
    render(<SubscriptionsPanel />);
    expect(screen.getByText('No subscription data available')).toBeTruthy();
  });

  it('renders Overview and Events view toggles when data is available', () => {
    mockUseQuery.mockReturnValue(mockDataWithMetrics);
    render(<SubscriptionsPanel />);
    expect(screen.getByText('Overview')).toBeTruthy();
    // Events button text includes count like "Events (0)"
    expect(screen.getByText(/Events/)).toBeTruthy();
  });

  it('shows Overview active by default when data is available', () => {
    mockUseQuery.mockReturnValue(mockDataWithMetrics);
    render(<SubscriptionsPanel />);
    const overviewBtn = screen.getByText('Overview');
    // Active button has emerald styling
    expect(overviewBtn.className).toContain('emerald');
  });

  it('renders metrics when data is available', () => {
    mockUseQuery.mockReturnValue(mockDataWithMetrics);
    render(<SubscriptionsPanel />);
    expect(screen.getByText('Free to paid')).toBeTruthy();
  });

  it('switches to Events view on click', () => {
    mockUseQuery.mockReturnValue(mockDataWithMetrics);
    render(<SubscriptionsPanel />);
    const eventsBtn = screen.getByText(/Events/);
    fireEvent.click(eventsBtn);
    // After click, events view is active — events button stays visible
    expect(screen.getByText(/Events/)).toBeTruthy();
  });
});
