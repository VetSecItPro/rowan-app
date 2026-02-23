// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('use-debounce', () => ({ useDebounce: (value: unknown) => [value] }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
    isFetching: false,
  })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(),
}));

import { AuditTrailPanel } from '@/components/admin/panels/AuditTrailPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('AuditTrailPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<AuditTrailPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders sub-tab navigation buttons', () => {
    render(<AuditTrailPanel />);
    // Use getAllByText since "Admin Actions" also appears as a select option
    const allEventBtns = screen.getAllByText('All Events');
    expect(allEventBtns.length).toBeGreaterThan(0);
    const adminActionBtns = screen.getAllByText('Admin Actions');
    expect(adminActionBtns.length).toBeGreaterThan(0);
    // "Signups" appears as a tab button AND as a select option — use getAllByText
    const signupItems = screen.getAllByText('Signups');
    expect(signupItems.length).toBeGreaterThan(0);
  });

  it('renders search input', () => {
    render(<AuditTrailPanel />);
    expect(screen.getByPlaceholderText(/Search events/)).toBeTruthy();
  });

  it('renders filter dropdown', () => {
    render(<AuditTrailPanel />);
    expect(screen.getByText('All Categories')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    render(<AuditTrailPanel />);
    expect(screen.getByText('No audit events found')).toBeTruthy();
  });

  it('shows loading spinner when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<AuditTrailPanel />);
    expect(screen.getByText(/Loading audit trail/)).toBeTruthy();
  });

  it('renders table with events when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        events: [
          {
            id: 'evt-1',
            category: 'admin',
            actor: 'admin@example.com',
            action: 'user_suspended',
            target: 'user@example.com',
            details: null,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      },
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<AuditTrailPanel />);
    expect(screen.getByText('admin@example.com')).toBeTruthy();
    expect(screen.getByText('user_suspended')).toBeTruthy();
  });

  it('Subscriptions tab is present in sub-nav', () => {
    render(<AuditTrailPanel />);
    // "Subscriptions" appears as both a tab button and a select option
    const subscriptionsItems = screen.getAllByText('Subscriptions');
    expect(subscriptionsItems.length).toBeGreaterThan(0);
  });

  it('shows search input that accepts text', () => {
    render(<AuditTrailPanel />);
    const searchInput = screen.getByPlaceholderText(/Search events/) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'admin' } });
    expect(searchInput.value).toBe('admin');
  });
});
