// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
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

import TypingIndicator from '@/components/chat/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders without crashing', () => {
    render(<TypingIndicator />);
    expect(document.body).toBeTruthy();
  });

  it('renders the typing label', () => {
    render(<TypingIndicator />);
    expect(screen.getByText('Rowan is typing...')).toBeInTheDocument();
  });

  it('renders three dots', () => {
    const { container } = render(<TypingIndicator />);
    // The dots are span elements with bg-gray-400 class
    const dots = container.querySelectorAll('.bg-gray-400');
    expect(dots).toHaveLength(3);
  });

  it('renders in a flex container', () => {
    const { container } = render(<TypingIndicator />);
    const flexDiv = container.querySelector('.flex');
    expect(flexDiv).toBeInTheDocument();
  });

  it('renders dots as rounded elements', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThan(0);
  });
});
