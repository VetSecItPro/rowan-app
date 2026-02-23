// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// AICompanionTeaser uses IntersectionObserver directly in a useEffect
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

import { AICompanionTeaser } from '@/components/home/AICompanionTeaser';

describe('AICompanionTeaser', () => {
  it('renders without crashing', () => {
    const { container } = render(<AICompanionTeaser />);
    expect(container).toBeTruthy();
  });

  it('renders content mentioning the AI companion', () => {
    render(<AICompanionTeaser />);
    // Multiple elements may contain "Rowan" - use getAllByText and check at least one exists
    const rowanElements = screen.getAllByText(/Rowan/i);
    expect(rowanElements.length).toBeGreaterThan(0);
  });

  it('renders a CTA link', () => {
    render(<AICompanionTeaser />);
    const links = document.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });
});
