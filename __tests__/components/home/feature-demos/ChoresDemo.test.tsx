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

import { ChoresDemo } from '@/components/home/feature-demos/ChoresDemo';

describe('ChoresDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChoresDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<ChoresDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders chore names in the list step', () => {
    render(<ChoresDemo />);
    expect(screen.getByText('Clean Kitchen')).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<ChoresDemo />);
    expect(screen.getByText('Family chores')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<ChoresDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
