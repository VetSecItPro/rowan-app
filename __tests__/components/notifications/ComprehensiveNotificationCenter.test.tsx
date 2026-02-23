// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComprehensiveNotificationCenter } from '@/components/notifications/ComprehensiveNotificationCenter';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('@/lib/utils/toast', () => ({ showError: vi.fn() }));

vi.mock('@/lib/services/in-app-notifications-service', () => ({
  inAppNotificationsService: {
    getUserNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
    subscribeToRealtime: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
}));

vi.mock('@/lib/services/bills-service', () => ({
  billsService: {
    payBill: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ComprehensiveNotificationCenter', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ComprehensiveNotificationCenter userId="user-1" spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders the notification bell button', () => {
    render(<ComprehensiveNotificationCenter userId="user-1" spaceId="space-1" />);
    // Should render a bell/notification button
    const btn = document.querySelector('button');
    expect(btn).toBeTruthy();
  });

  it('renders without spaceId prop', () => {
    const { container } = render(
      <ComprehensiveNotificationCenter userId="user-1" />
    );
    expect(container).toBeTruthy();
  });
});
