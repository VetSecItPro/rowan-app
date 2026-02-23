// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: vi.fn(() => true),
  useReducedMotion: vi.fn(() => false),
}));

import { MessagesDemo } from '@/components/home/feature-demos/MessagesDemo';

describe('MessagesDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<MessagesDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<MessagesDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the family chat heading', () => {
    render(<MessagesDemo />);
    expect(screen.getByText('Family Chat')).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<MessagesDemo />);
    expect(screen.getByText('Family chat')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<MessagesDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
