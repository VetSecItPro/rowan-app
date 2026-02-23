// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test' },
  })),
}));

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(() => ({
    isAvailable: true,
    isRegistered: false,
    isPermissionGranted: false,
    isLoading: false,
    error: null,
    register: vi.fn(),
    unregister: vi.fn(),
  })),
  usePushStatus: vi.fn(() => ({ isNativeApp: false })),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('PushNotificationProvider', () => {
  it('renders without crashing', async () => {
    const { PushNotificationProvider } = await import('@/components/notifications/PushNotificationProvider');
    const { container } = render(
      <PushNotificationProvider>
        <div data-testid="child">child content</div>
      </PushNotificationProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renders children', async () => {
    const { PushNotificationProvider } = await import('@/components/notifications/PushNotificationProvider');
    render(
      <PushNotificationProvider>
        <div data-testid="child">child content</div>
      </PushNotificationProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('child content')).toBeTruthy();
  });

  it('does not render toasts when no notifications exist', async () => {
    const { PushNotificationProvider } = await import('@/components/notifications/PushNotificationProvider');
    const { container } = render(
      <PushNotificationProvider>
        <span>content</span>
      </PushNotificationProvider>
    );
    expect(container.querySelectorAll('[class*="pointer-events-auto"]').length).toBe(0);
  });

  it('exports usePushContext hook', async () => {
    const { usePushContext } = await import('@/components/notifications/PushNotificationProvider');
    expect(typeof usePushContext).toBe('function');
  });
});
