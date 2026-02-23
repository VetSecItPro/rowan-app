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

import { NotificationsPanel } from '@/components/admin/panels/NotificationsPanel';

const mockUseQuery = vi.mocked(useQuery);

const mockNotifications = [
  {
    id: 'n1',
    name: 'Alice',
    email: 'alice@example.com',
    subscribed: true,
    source: 'landing',
    created_at: '2024-01-01T00:00:00Z',
    unsubscribed_at: null,
  },
  {
    id: 'n2',
    name: 'Bob',
    email: 'bob@example.com',
    subscribed: false,
    source: 'blog',
    created_at: '2024-02-01T00:00:00Z',
    unsubscribed_at: '2024-03-01T00:00:00Z',
  },
];

describe('NotificationsPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<NotificationsPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<NotificationsPanel />);
    expect(screen.getByText(/Loading notifications/)).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    render(<NotificationsPanel />);
    expect(screen.getByText('No notifications found')).toBeTruthy();
  });

  it('renders stats summary', () => {
    render(<NotificationsPanel />);
    // "Total" appears once in the stats card
    expect(screen.getByText('Total')).toBeTruthy();
    // "Subscribed" appears in the stats card AND in filter buttons — use getAllByText
    expect(screen.getAllByText('Subscribed').length).toBeGreaterThan(0);
  });

  it('renders notification emails when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: { notifications: mockNotifications, total: 2, subscribed: 1 },
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<NotificationsPanel />);
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByText('bob@example.com')).toBeTruthy();
  });

  it('filters notifications by search term', () => {
    mockUseQuery.mockReturnValue({
      data: { notifications: mockNotifications, total: 2, subscribed: 1 },
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<NotificationsPanel />);
    const searchInput = screen.getByPlaceholderText(/Search/) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.queryByText('bob@example.com')).toBeNull();
  });
});
