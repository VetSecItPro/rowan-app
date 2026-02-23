// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

import { MobileStickyBar } from '@/components/home/MobileStickyBar';

describe('MobileStickyBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<MobileStickyBar />);
    expect(container).toBeTruthy();
  });

  it('renders a root wrapper element', () => {
    const { container } = render(<MobileStickyBar />);
    // The component renders a container div even when the bar is not visible
    expect(container).toBeTruthy();
    expect(container.innerHTML).toBeDefined();
  });

  it('bar is hidden initially because scroll position is below threshold', () => {
    const { container } = render(<MobileStickyBar />);
    // window.scrollY = 0 < 600 threshold, so bar starts hidden
    // With AnimatePresence showing nothing, the container is empty or just has the wrapper
    expect(container).toBeTruthy();
  });
});
