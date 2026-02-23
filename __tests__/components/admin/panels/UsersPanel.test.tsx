// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('use-debounce', () => ({ useDebounce: (value: unknown) => [value] }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn(), isFetching: false })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(),
}));

import { UsersPanel } from '@/components/admin/panels/UsersPanel';

const mockUseQuery = vi.mocked(useQuery);

const mockUsersData = {
  users: [
    {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      tier: 'pro',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      last_sign_in_at: '2024-06-01T00:00:00Z',
      space_count: 1,
    },
  ],
  total: 1,
};

describe('UsersPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<UsersPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders User List tab', () => {
    render(<UsersPanel />);
    expect(screen.getByText('User List')).toBeTruthy();
  });

  it('renders Lifecycle tab', () => {
    render(<UsersPanel />);
    expect(screen.getByText('Lifecycle')).toBeTruthy();
  });

  it('renders Spaces tab', () => {
    render(<UsersPanel />);
    expect(screen.getByText('Spaces')).toBeTruthy();
  });

  it('shows loading state when fetching users', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<UsersPanel />);
    expect(screen.getByText(/Loading users/)).toBeTruthy();
  });

  it('renders user count when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: mockUsersData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<UsersPanel />);
    expect(screen.getByText(/Users/)).toBeTruthy();
  });

  it('renders search input in user list', () => {
    render(<UsersPanel />);
    expect(screen.getByPlaceholderText(/Search/)).toBeTruthy();
  });

  it('switches to Lifecycle tab on click', () => {
    render(<UsersPanel />);
    fireEvent.click(screen.getByText('Lifecycle'));
    const tab = screen.getByText('Lifecycle');
    expect(tab.closest('button')?.className).toContain('border-indigo-500');
  });

  it('switches to Spaces tab on click', () => {
    render(<UsersPanel />);
    fireEvent.click(screen.getByText('Spaces'));
    const tab = screen.getByText('Spaces');
    expect(tab.closest('button')?.className).toContain('border-indigo-500');
  });

  it('renders filter dropdown with All option', () => {
    render(<UsersPanel />);
    // The filter select has option text "All"
    expect(screen.getByText('All')).toBeTruthy();
  });
});
