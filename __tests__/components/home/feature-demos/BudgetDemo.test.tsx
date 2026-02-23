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

import { BudgetDemo } from '@/components/home/feature-demos/BudgetDemo';

describe('BudgetDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<BudgetDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<BudgetDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders budget demo step content', () => {
    render(<BudgetDemo />);
    expect(screen.getByText('February Budget')).toBeTruthy();
  });

  it('renders budget step labels', () => {
    render(<BudgetDemo />);
    expect(screen.getByText('Monthly overview')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<BudgetDemo className="test-class" />);
    expect(container.querySelector('.test-class')).toBeTruthy();
  });
});
