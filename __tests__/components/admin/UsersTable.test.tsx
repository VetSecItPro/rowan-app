// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

import { UsersTable } from '@/components/admin/UsersTable';

interface TestUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

const mockUsers: TestUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    created_at: '2024-01-01T10:00:00Z',
    last_sign_in_at: '2024-06-01T10:00:00Z',
    email_confirmed_at: '2024-01-01T10:05:00Z',
    status: 'active',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    created_at: '2024-02-15T09:00:00Z',
    last_sign_in_at: null,
    email_confirmed_at: null,
    status: 'inactive',
  },
  {
    id: 'user-3',
    email: 'carol@example.com',
    created_at: '2024-03-10T14:00:00Z',
    last_sign_in_at: '2024-05-20T08:00:00Z',
    email_confirmed_at: '2024-03-10T14:10:00Z',
    status: 'suspended',
  },
];

describe('UsersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(
      <UsersTable users={[]} isLoading={true} searchTerm="" filter="all" />
    );
    expect(screen.getByText('Loading users...')).toBeTruthy();
  });

  it('renders user emails in the table', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByText('bob@example.com')).toBeTruthy();
  });

  it('renders table headers', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('User')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByText('Joined')).toBeTruthy();
    expect(screen.getByText('Last Sign In')).toBeTruthy();
  });

  it('displays Active status badge for active users', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('displays Inactive status badge for inactive users', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('displays Suspended status badge for suspended users', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('shows Never for null last_sign_in_at', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    expect(screen.getByText('Never')).toBeTruthy();
  });

  it('filters users by search term', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="alice" filter="all" />
    );
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.queryByText('bob@example.com')).toBeNull();
  });

  it('filters users by active status', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="active" />
    );
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.queryByText('bob@example.com')).toBeNull();
  });

  it('shows empty state when no users match filters', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="xyznotfound" filter="all" />
    );
    expect(screen.getByText('No users found')).toBeTruthy();
  });

  it('opens user modal when a table row is clicked', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    const rows = screen.getAllByRole('row');
    // First row is header, second is first user
    fireEvent.click(rows[1]);
    expect(screen.getByText('Manage User')).toBeTruthy();
  });

  it('shows Suspend User and Delete User actions in modal', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    const rows = screen.getAllByRole('row');
    fireEvent.click(rows[1]);
    expect(screen.getByText('Suspend User')).toBeTruthy();
    expect(screen.getByText('Delete User')).toBeTruthy();
  });

  it('closes modal when Cancel is clicked', () => {
    render(
      <UsersTable users={mockUsers} isLoading={false} searchTerm="" filter="all" />
    );
    const rows = screen.getAllByRole('row');
    fireEvent.click(rows[1]);
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Manage User')).toBeNull();
  });
});
