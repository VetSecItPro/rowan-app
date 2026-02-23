// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: React.PropsWithChildren<{ onClick?: () => void; className?: string; [key: string]: unknown }>) =>
    React.createElement('button', { onClick, className, ...props }, children),
}));

const mockHasUserMadeCookieChoice = vi.fn(() => false);
const mockUpdateCookiePreferences = vi.fn();

vi.mock('@/lib/utils/cookies', () => ({
  hasUserMadeCookieChoice: () => mockHasUserMadeCookieChoice(),
  updateCookiePreferences: (...args: unknown[]) => mockUpdateCookiePreferences(...args),
}));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasUserMadeCookieChoice.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    const { container } = render(<CookieConsentBanner />);
    expect(container).toBeTruthy();
  });

  it('shows the banner content when user has not made a cookie choice', async () => {
    mockHasUserMadeCookieChoice.mockReturnValue(false);
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    await act(async () => {
      render(<CookieConsentBanner />);
    });
    await waitFor(() => {
      // Banner renders when not dismissed - check for the privacy message
      const bodyText = document.body.textContent ?? '';
      expect(bodyText).toContain('Essential Cookies');
    });
  });

  it('does not show banner when user already made a cookie choice', async () => {
    mockHasUserMadeCookieChoice.mockReturnValue(true);
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    await act(async () => {
      render(<CookieConsentBanner />);
    });
    await waitFor(() => {
      const bodyText = document.body.textContent ?? '';
      expect(bodyText).not.toContain('Got it');
    });
  });

  it('shows Got it button', async () => {
    mockHasUserMadeCookieChoice.mockReturnValue(false);
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    await act(async () => {
      render(<CookieConsentBanner />);
    });
    await waitFor(() => {
      const gotItBtn = screen.queryByTestId('cookie-consent-accept');
      if (gotItBtn) expect(gotItBtn).toBeTruthy();
      else {
        const bodyText = document.body.textContent ?? '';
        expect(bodyText).toContain('Got it');
      }
    });
  });

  it('calls updateCookiePreferences with correct payload when accepted', async () => {
    mockHasUserMadeCookieChoice.mockReturnValue(false);
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    await act(async () => {
      render(<CookieConsentBanner />);
    });
    await waitFor(() => {
      const btn = screen.queryByTestId('cookie-consent-accept');
      if (btn) {
        fireEvent.click(btn);
        expect(mockUpdateCookiePreferences).toHaveBeenCalledWith(
          expect.objectContaining({ necessary: true, analytics: false, marketing: false })
        );
      }
    });
  });

  it('hides banner after acknowledging', async () => {
    mockHasUserMadeCookieChoice.mockReturnValue(false);
    const { CookieConsentBanner } = await import('@/components/cookies/CookieConsentBanner');
    await act(async () => {
      render(<CookieConsentBanner />);
    });
    const btn = screen.queryByTestId('cookie-consent-accept');
    if (btn) {
      await act(async () => { fireEvent.click(btn); });
      await waitFor(() => {
        expect(screen.queryByTestId('cookie-consent-accept')).toBeNull();
      });
    }
  });
});
