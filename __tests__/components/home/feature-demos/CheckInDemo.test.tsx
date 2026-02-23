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

import { CheckInDemo } from '@/components/home/feature-demos/CheckInDemo';

describe('CheckInDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<CheckInDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<CheckInDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders mood labels', () => {
    render(<CheckInDemo />);
    expect(screen.getByText('Great')).toBeTruthy();
    expect(screen.getByText('Rough')).toBeTruthy();
  });

  it('renders the step navigation dots', () => {
    render(<CheckInDemo />);
    // 4 steps means 4 navigation dot buttons
    const stepButtons = screen.getAllByRole('button');
    expect(stepButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<CheckInDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
