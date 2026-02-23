// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatRelativeTime: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/lib/services/reminder-notifications-service', () => ({
  reminderNotificationsService: {
    getUserNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    formatNotificationMessage: vi.fn().mockReturnValue('You have a reminder due'),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  })),
}));

import { NotificationCenter } from '@/components/reminders/NotificationCenter';

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NotificationCenter userId="user-1" />);
    expect(container).toBeTruthy();
  });

  it('renders a bell icon button', () => {
    render(<NotificationCenter userId="user-1" />);
    const btn = screen.getByRole('button', { name: 'Notifications' });
    expect(btn).toBeTruthy();
  });

  it('does not show dropdown panel initially', () => {
    render(<NotificationCenter userId="user-1" />);
    expect(screen.queryByText('Notifications')).toBeNull();
  });

  it('opens dropdown when bell button is clicked', () => {
    render(<NotificationCenter userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    // The panel header "Notifications" h3 should appear
    const headings = screen.getAllByText('Notifications');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('shows Loading notifications text when panel is open and loading', () => {
    render(<NotificationCenter userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Loading notifications...')).toBeTruthy();
  });

  it('renders close button in open dropdown', () => {
    render(<NotificationCenter userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('button', { name: 'Close notifications' })).toBeTruthy();
  });

  it('closes dropdown when close button is clicked', () => {
    render(<NotificationCenter userId="user-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
    expect(screen.queryByText('Loading notifications...')).toBeNull();
  });

  it('does not show unread badge when unreadCount is 0', () => {
    render(<NotificationCenter userId="user-1" />);
    // No badge span with unread count should be visible
    const badge = document.querySelector('.absolute.top-1.right-1');
    expect(badge).toBeNull();
  });
});
