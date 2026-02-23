// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUsePushNotifications = vi.fn(() => ({
  isAvailable: false,
  isPermissionGranted: false,
  isRegistered: false,
  isLoading: false,
  error: null,
  register: vi.fn(),
  unregister: vi.fn(),
}));

const mockUsePushStatus = vi.fn(() => ({
  isNativeApp: false,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: (...args: unknown[]) => mockUsePushNotifications(...args),
  usePushStatus: () => mockUsePushStatus(),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

import { PushNotificationSettings } from '@/components/notifications/PushNotificationSettings';

describe('PushNotificationSettings', () => {
  it('renders without crashing when push is unavailable', () => {
    const { container } = render(
      <PushNotificationSettings spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('shows unavailable message when push not available', () => {
    render(<PushNotificationSettings spaceId="space-1" />);
    expect(screen.getByText('Push Notifications Unavailable')).toBeTruthy();
  });

  it('shows mobile app download message for web', () => {
    render(<PushNotificationSettings spaceId="space-1" />);
    expect(screen.getByText(/download the rowan mobile app/i)).toBeTruthy();
  });

  it('accepts className prop without crashing', () => {
    const { container } = render(
      <PushNotificationSettings spaceId="space-1" className="custom-class" />
    );
    expect(container).toBeTruthy();
  });

  it('shows notification categories when push is available', () => {
    mockUsePushNotifications.mockReturnValueOnce({
      isAvailable: true,
      isPermissionGranted: true,
      isRegistered: true,
      isLoading: false,
      error: null,
      register: vi.fn(),
      unregister: vi.fn(),
    });
    render(<PushNotificationSettings spaceId="space-1" />);
    expect(screen.getByText('Notification Categories')).toBeTruthy();
  });
});
