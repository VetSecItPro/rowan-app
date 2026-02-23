// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { Sidebar } from '@/components/navigation/Sidebar';

// Sidebar uses localStorage to persist expanded state
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });
});

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn(), prefetch: vi.fn() })),
  usePathname: vi.fn(() => '/dashboard'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
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

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'My Home' },
    spaces: [],
    loading: false,
  })),
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  useChatContextSafe: vi.fn(() => ({
    hasUnread: false,
    canAccessAI: true,
    toggleChat: vi.fn(),
  })),
}));

vi.mock('@/lib/contexts/DeviceContext', () => ({
  useDevice: vi.fn(() => ({ isDesktop: true, isMobile: false })),
}));

vi.mock('@/lib/services/prefetch-service', () => ({
  prefetchFeatureData: vi.fn().mockResolvedValue(undefined),
  prefetchCriticalData: vi.fn().mockResolvedValue(undefined),
  ROUTE_TO_FEATURE_MAP: {},
}));

vi.mock('@/lib/navigation', () => ({
  NAVIGATION_GROUPS: [
    {
      id: 'main',
      label: 'Main',
      items: [
        { id: 'tasks', label: 'Tasks', href: '/tasks', icon: () => null, gradient: 'bg-gradient-tasks', description: '' },
        { id: 'calendar', label: 'Calendar', href: '/calendar', icon: () => null, gradient: 'bg-gradient-calendar', description: '' },
      ],
    },
  ],
  NAVIGATION_ITEMS: [
    { id: 'tasks', label: 'Tasks', href: '/tasks', icon: () => null, gradient: 'bg-gradient-tasks', description: '', group: 'main' },
  ],
}));

vi.mock('@/hooks/useAdmin', () => ({
  useAdmin: vi.fn(() => ({ isAdmin: false })),
}));

describe('Sidebar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Sidebar />);
    expect(container).toBeTruthy();
  });

  it('renders a sidebar DOM element', () => {
    const { container } = render(<Sidebar />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders navigation links', () => {
    render(<Sidebar />);
    const links = document.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });
});
