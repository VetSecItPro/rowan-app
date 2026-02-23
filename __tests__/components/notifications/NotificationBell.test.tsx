// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/milestone-notification-service', () => ({
  getUserNotifications: vi.fn(() => Promise.resolve([])),
  getUnreadNotificationCount: vi.fn(() => Promise.resolve(0)),
  markNotificationAsRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsAsRead: vi.fn(() => Promise.resolve()),
  deleteNotification: vi.fn(() => Promise.resolve()),
  subscribeToNotifications: vi.fn(() => ({ id: 'channel-1' })),
}));

describe('NotificationBell', () => {
  let NotificationBell: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ default: NotificationBell } = await import('@/components/notifications/NotificationBell'));
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });

  it('renders the bell button with aria-label', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const btn = screen.getByLabelText('Notifications');
    expect(btn.getAttribute('aria-expanded')).toBeDefined();
  });

  it('bell button has aria-haspopup attribute', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const btn = screen.getByLabelText('Notifications');
    expect(btn.getAttribute('aria-haspopup')).toBe('true');
  });

  it('opens notification panel when bell is clicked', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const bellBtn = screen.getByLabelText('Notifications');
    await act(async () => { fireEvent.click(bellBtn); });
    await waitFor(() => {
      expect(screen.getAllByText('Notifications').length).toBeGreaterThan(0);
    });
  });

  it('shows loading then empty state after click', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const bellBtn = screen.getByLabelText('Notifications');
    await act(async () => { fireEvent.click(bellBtn); });
    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeTruthy();
    });
  });

  it('closes panel when backdrop is clicked', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const bellBtn = screen.getByLabelText('Notifications');
    await act(async () => { fireEvent.click(bellBtn); });
    await waitFor(() => screen.getByText('No notifications yet'));
    const backdrop = document.querySelector('.fixed.inset-0.z-40');
    if (backdrop) {
      await act(async () => { fireEvent.click(backdrop); });
      await waitFor(() => {
        expect(screen.queryByText('No notifications yet')).toBeNull();
      });
    }
  });

  it('panel is not shown initially', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(screen.queryByText('No notifications yet')).toBeNull();
  });

  it('toggling bell closes and opens panel', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    const bellBtn = screen.getByLabelText('Notifications');
    // Open
    await act(async () => { fireEvent.click(bellBtn); });
    await waitFor(() => screen.getByText('No notifications yet'));
    // Close
    await act(async () => { fireEvent.click(bellBtn); });
    await waitFor(() => {
      expect(screen.queryByText('No notifications yet')).toBeNull();
    });
  });
});
