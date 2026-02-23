// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PresenceIndicator, OnlineUsersIndicator } from '@/components/shared/PresenceIndicator';

describe('PresenceIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when users list is empty', () => {
    const { container } = render(<PresenceIndicator users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders without crashing with users', () => {
    const users = [
      { user_id: 'user-1', user_email: 'alice@example.com' },
    ];
    const { container } = render(<PresenceIndicator users={users} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows first letter of user email', () => {
    const users = [
      { user_id: 'user-1', user_email: 'alice@example.com' },
    ];
    render(<PresenceIndicator users={users} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('shows overflow count when users exceed maxDisplay', () => {
    const users = [
      { user_id: 'user-1', user_email: 'a@example.com' },
      { user_id: 'user-2', user_email: 'b@example.com' },
      { user_id: 'user-3', user_email: 'c@example.com' },
      { user_id: 'user-4', user_email: 'd@example.com' },
    ];
    render(<PresenceIndicator users={users} maxDisplay={3} />);
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('handles users without email', () => {
    const users = [{ user_id: 'user-1', user_email: undefined }];
    const { container } = render(<PresenceIndicator users={users} />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('OnlineUsersIndicator', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(<OnlineUsersIndicator count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders count when greater than 0', () => {
    render(<OnlineUsersIndicator count={2} />);
    expect(screen.getByText(/partners online/)).toBeTruthy();
  });

  it('shows singular partner for count of 1', () => {
    render(<OnlineUsersIndicator count={1} />);
    expect(screen.getByText('1 partner online')).toBeTruthy();
  });

  it('shows plural partners for count > 1', () => {
    render(<OnlineUsersIndicator count={3} />);
    expect(screen.getByText('3 partners online')).toBeTruthy();
  });
});
