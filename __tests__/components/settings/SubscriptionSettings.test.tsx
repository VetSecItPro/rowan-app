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

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/contexts/subscription-context', () => ({
  useSubscriptionSafe: vi.fn(() => ({
    tier: 'free',
    effectiveTier: 'free',
    isLoading: false,
    limits: {
      maxActiveTasks: 50,
      dailyTaskCreation: 5,
      canCreateCalendar: false,
      maxShoppingLists: 3,
      maxShoppingItems: 20,
      dailyShoppingUpdates: 10,
      messageHistoryDays: 7,
      dailyMessages: 20,
      dailyQuickActions: 5,
      canUploadPhotos: false,
      canUseMealPlanning: false,
      canUseReminders: true,
      canUseGoals: false,
      canUseHousehold: false,
      canUseLocation: false,
      canUseAI: false,
      canUseIntegrations: false,
      canUseEventProposals: false,
      realtimeSyncDelay: 30,
      maxUsers: 2,
      maxSpaces: 1,
      storageGB: 0,
    },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ url: 'https://billing.example.com' }),
  }),
}));

import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';

describe('SubscriptionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SubscriptionSettings />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Subscription heading', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('Subscription')).toBeTruthy();
  });

  it('displays Free Plan for free tier', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByTestId('subscription-plan-name')).toBeTruthy();
    expect(screen.getByTestId('subscription-plan-name').textContent).toContain('Free');
  });

  it('renders Feature Limits section', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('Feature Limits')).toBeTruthy();
  });

  it('renders Billing and Management section', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('Billing & Management')).toBeTruthy();
  });

  it('renders View Plans and Pricing link', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('View Plans & Pricing')).toBeTruthy();
  });

  it('renders Contact Support link', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('Contact Support')).toBeTruthy();
  });

  it('shows upgrade button for free tier', () => {
    render(<SubscriptionSettings />);
    expect(screen.getByText('Upgrade')).toBeTruthy();
  });
});
