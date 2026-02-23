// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const mockUseAuth = vi.fn(() => ({
  user: null,
  session: null,
  loading: false,
  signOut: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

import { PublicHeader } from '@/components/layout/PublicHeader';

describe('PublicHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<PublicHeader />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders the Rowan brand name', () => {
    render(<PublicHeader />);
    expect(screen.getByText('Rowan')).toBeTruthy();
  });

  it('renders the logo image', () => {
    render(<PublicHeader />);
    expect(screen.getByAltText('Rowan Logo')).toBeTruthy();
  });

  it('renders navigation links for unauthenticated user', () => {
    render(<PublicHeader />);
    expect(screen.getAllByText('Features').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pricing').length).toBeGreaterThan(0);
  });

  it('renders Login link for unauthenticated user', () => {
    render(<PublicHeader />);
    const loginLinks = screen.getAllByText('Login');
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it('renders Sign Up link for unauthenticated user', () => {
    render(<PublicHeader />);
    const signUpLinks = screen.getAllByText('Sign Up');
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('renders Dashboard link for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    render(<PublicHeader />);
    const dashboardLinks = screen.getAllByText('Dashboard');
    expect(dashboardLinks.length).toBeGreaterThan(0);
  });

  it('renders mobile menu toggle button', () => {
    render(<PublicHeader />);
    const menuButton = screen.getByLabelText('Open menu');
    expect(menuButton).toBeTruthy();
  });

  it('opens mobile menu on toggle click', () => {
    render(<PublicHeader />);
    const menuButton = screen.getByLabelText('Open menu');
    fireEvent.click(menuButton);
    expect(screen.getByLabelText('Close menu')).toBeTruthy();
  });

  it('renders as animated header when animated prop is true', () => {
    const { container } = render(<PublicHeader animated />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders header element', () => {
    render(<PublicHeader />);
    const header = document.querySelector('header');
    expect(header).toBeTruthy();
  });
});
