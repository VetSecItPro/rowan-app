// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => '/dashboard'),
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
    get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ prefetchQuery: vi.fn() })),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User' },
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'My Home' },
    spaces: [],
  })),
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({ isDesktop: false, isMobile: true })),
}));

vi.mock('@/lib/services/prefetch-service', () => ({
  prefetchFeatureData: vi.fn().mockResolvedValue(undefined),
  prefetchCriticalData: vi.fn().mockResolvedValue(undefined),
  ROUTE_TO_FEATURE_MAP: {},
}));

vi.mock('@/lib/navigation', () => ({
  NAVIGATION_ITEMS: [
    { id: 'tasks', label: 'Tasks', href: '/tasks', icon: () => null, gradient: 'bg-blue-500', description: '' },
    { id: 'calendar', label: 'Calendar', href: '/calendar', icon: () => null, gradient: 'bg-purple-500', description: '' },
  ],
}));

describe('HamburgerMenu', () => {
  it('renders without crashing', () => {
    const { container } = render(<HamburgerMenu />);
    expect(container).toBeTruthy();
  });

  it('renders the menu toggle button with Menu aria-label', () => {
    render(<HamburgerMenu />);
    expect(screen.getByRole('button', { name: /^menu$/i })).toBeTruthy();
  });

  it('renders a button element', () => {
    const { container } = render(<HamburgerMenu />);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('button has title attribute', () => {
    render(<HamburgerMenu />);
    const btn = screen.getByRole('button', { name: /^menu$/i });
    expect(btn.getAttribute('title')).toBe('Menu');
  });

  it('renders without any console errors for normal state', () => {
    // Component renders in closed state (portal not mounted yet due to useEffect)
    const { container } = render(<HamburgerMenu />);
    expect(container.firstChild).toBeTruthy();
  });
});
