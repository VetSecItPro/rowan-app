// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/utils/cookies', () => ({
  getCookiePreferences: vi.fn(() => ({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
    preferences: false,
  })),
  updateCookiePreferences: vi.fn(),
  hasUserMadeCookieChoice: vi.fn(() => true),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_, tag: string) =>
        ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, props as Record<string, unknown>, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { CookiePreferences } from '@/components/cookies/CookiePreferences';

describe('CookiePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Cookie Information')).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Cookie Information')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<CookiePreferences />);
    // Use getAllByText since the text appears in multiple elements
    const matches = screen.getAllByText(/only uses essential cookies/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Essential Cookies category', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Essential Cookies')).toBeInTheDocument();
  });

  it('marks essential cookies as Required', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('renders Always Active indicator for required cookies', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Always Active')).toBeInTheDocument();
  });

  it('renders the What Cookies We Use section', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('What Cookies We Use')).toBeInTheDocument();
  });

  it('renders Session & Authentication cookie description', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Session & Authentication')).toBeInTheDocument();
  });

  it('renders Security & CSRF Protection description', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Security & CSRF Protection')).toBeInTheDocument();
  });

  it('renders App Functionality description', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('App Functionality')).toBeInTheDocument();
  });

  it('renders the legal notice', () => {
    render(<CookiePreferences />);
    expect(screen.getByText('Simple Cookie Policy')).toBeInTheDocument();
  });

  it('renders the Cookie Information icon area', () => {
    const { container } = render(<CookiePreferences />);
    // The cookie icon area should be rendered
    expect(container.querySelector('.space-y-6')).toBeInTheDocument();
  });
});
