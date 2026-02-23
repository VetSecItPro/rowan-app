// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string; [key: string]: unknown }>) =>
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

const mockAuthUser = {
  id: 'user-1', name: 'Test User', email: 'test@example.com', avatar_url: null, color_theme: 'emerald',
};
const mockUseAuth = vi.fn(() => ({
  user: mockAuthUser, session: null, loading: false, signOut: vi.fn(),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    spaces: [{ id: 'space-1', name: 'Test Space' }],
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
  })),
}));

vi.mock('@/lib/hooks/useAdminStatus', () => ({
  useAdminStatus: vi.fn(() => ({ data: false, isLoading: false })),
}));

vi.mock('@/components/navigation/HamburgerMenu', () => ({
  HamburgerMenu: () => React.createElement('div', { 'data-testid': 'hamburger-menu' }, 'Menu'),
}));

vi.mock('@/components/notifications/ComprehensiveNotificationCenter', () => ({
  ComprehensiveNotificationCenter: () => React.createElement('div', { 'data-testid': 'notification-center' }, 'Notifications'),
}));

describe('Header', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockAuthUser, session: null, loading: false, signOut: vi.fn(),
    });
  });

  it('renders without crashing', async () => {
    const { Header } = await import('@/components/layout/Header');
    const { container } = render(<Header />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders header element', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByRole('banner')).toBeTruthy();
  });

  it('renders the Rowan logo image', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByAltText('Rowan Logo')).toBeTruthy();
  });

  it('renders the brand name', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByText('Rowan')).toBeTruthy();
  });

  it('renders notifications when user is logged in', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByTestId('notification-center')).toBeTruthy();
  });

  it('renders settings link when user is logged in', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByLabelText('Settings')).toBeTruthy();
  });

  it('renders dashboard button when user is logged in', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('renders login link when user is not logged in', async () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false, signOut: vi.fn() });
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByText('Login')).toBeTruthy();
  });

  it('shows loading skeleton when auth is loading', async () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: true, signOut: vi.fn() });
    const { Header } = await import('@/components/layout/Header');
    const { container } = render(<Header />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders hamburger menu', async () => {
    const { Header } = await import('@/components/layout/Header');
    render(<Header />);
    expect(screen.getByTestId('hamburger-menu')).toBeTruthy();
  });
});
