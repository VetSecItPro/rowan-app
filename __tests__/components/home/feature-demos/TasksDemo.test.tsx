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

import { TasksDemo } from '@/components/home/feature-demos/TasksDemo';

describe('TasksDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<TasksDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<TasksDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<TasksDemo />);
    expect(screen.getByText('Your tasks at a glance')).toBeTruthy();
  });

  it('renders task names in the task list step', () => {
    render(<TasksDemo />);
    expect(screen.getByText('Grocery shopping')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<TasksDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
