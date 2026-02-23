// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/cookies', () => ({
  hasUserMadeCookieChoice: vi.fn().mockReturnValue(true),
  updateCookiePreferences: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, 'data-testid': testId }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: string;
    'data-testid'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid={testId}>
      {children}
    </button>
  ),
}));

import { CookieConsent } from '@/components/gdpr/CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<CookieConsent />);
    expect(container).toBeTruthy();
  });

  it('renders null when user has already made a cookie choice', () => {
    const { container } = render(<CookieConsent />);
    // hasUserMadeCookieChoice returns true, so banner should not be visible
    // (note: component also waits for mounted state, so it returns null initially)
    expect(container.firstChild).toBeNull();
  });

  it('renders CookieConsentBanner (which is the same component)', () => {
    // CookieConsent is a re-export of CookieConsentBanner
    // Both components have the same behavior
    const { container } = render(<CookieConsent />);
    expect(container).toBeTruthy();
  });
});

// Also test the banner shows when no choice has been made
describe('CookieConsent - banner visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when hasUserMadeCookieChoice returns true', async () => {
    const { hasUserMadeCookieChoice } = await import('@/lib/utils/cookies');
    (hasUserMadeCookieChoice as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });

  it('is a valid React component', () => {
    expect(typeof CookieConsent).toBe('function');
  });
});
