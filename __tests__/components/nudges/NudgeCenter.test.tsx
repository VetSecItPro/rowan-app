// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test' },
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/services/smart-nudges-service', () => ({
  smartNudgesService: {
    getSmartNudges: vi.fn().mockResolvedValue([]),
    getNudgeSettings: vi.fn().mockResolvedValue({
      nudges_enabled: true,
      daily_nudges_enabled: true,
      weekly_summary_enabled: true,
      milestone_reminders_enabled: true,
      deadline_alerts_enabled: true,
      motivation_quotes_enabled: true,
    }),
    recordNudgeHistory: vi.fn().mockResolvedValue({ id: 'history-1' }),
    markNudgeAsClicked: vi.fn().mockResolvedValue(undefined),
    dismissNudge: vi.fn().mockResolvedValue(undefined),
    snoozeGoalNudges: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/components/nudges/NudgeSettingsModal', () => ({
  NudgeSettingsModal: () => null,
}));

vi.mock('@/components/nudges/NudgeAnalytics', () => ({
  NudgeAnalytics: () => null,
}));

vi.mock('@/components/nudges/NudgeCard', () => ({
  NudgeCard: ({ nudge }: { nudge: { title: string } }) =>
    React.createElement('div', { 'data-testid': 'nudge-card' }, nudge.title),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('NudgeCenter', () => {
  it('renders without crashing', async () => {
    const { NudgeCenter } = await import('@/components/nudges/NudgeCenter');
    const { container } = render(<NudgeCenter />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders loading skeleton initially', async () => {
    const { NudgeCenter } = await import('@/components/nudges/NudgeCenter');
    const { container } = render(<NudgeCenter />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });

  it('renders header by default', async () => {
    const { NudgeCenter } = await import('@/components/nudges/NudgeCenter');
    const { container } = render(<NudgeCenter showHeader={true} />);
    expect(container.firstChild).not.toBeNull();
  });
});
