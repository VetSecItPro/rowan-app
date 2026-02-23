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

import { GoalsDemo } from '@/components/home/feature-demos/GoalsDemo';

describe('GoalsDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<GoalsDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<GoalsDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders goal names in the list step', () => {
    render(<GoalsDemo />);
    expect(screen.getByText('Family Vacation Fund')).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<GoalsDemo />);
    expect(screen.getByText('Your goals')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<GoalsDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
