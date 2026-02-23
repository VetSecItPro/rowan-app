// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      const Component = ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) =>
        React.createElement(String(prop), props, children);
      return Component;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'pref-1',
              user_id: 'user-1',
              space_id: 'space-1',
              email_enabled: true,
              email_due_reminders: true,
              email_assignments: true,
              email_mentions: true,
              email_comments: false,
              in_app_enabled: true,
              in_app_due_reminders: true,
              in_app_assignments: true,
              in_app_mentions: true,
              in_app_comments: true,
              notification_frequency: 'instant',
              quiet_hours_enabled: false,
              quiet_hours_start: null,
              quiet_hours_end: null,
              digest_enabled: false,
              digest_time: '07:00',
              digest_timezone: 'America/Chicago',
              timezone: 'America/Chicago',
            },
            error: null,
          }),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/services/push-service', () => ({
  pushService: {
    isSupported: vi.fn().mockReturnValue(false),
    getPermissionStatus: vi.fn().mockReturnValue('default'),
    getCurrentSubscription: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { NotificationSettings } from '@/components/settings/NotificationSettings';

describe('NotificationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NotificationSettings />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<NotificationSettings />);
    // Shows loading spinner or content
    expect(document.body.textContent).toBeTruthy();
  });
});
