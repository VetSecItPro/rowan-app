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

import { RemindersDemo } from '@/components/home/feature-demos/RemindersDemo';

describe('RemindersDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<RemindersDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<RemindersDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<RemindersDemo />);
    expect(screen.getByText('Your reminders')).toBeTruthy();
  });

  it('renders reminder items in the list step', () => {
    render(<RemindersDemo />);
    expect(screen.getByText('Pick up prescription')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<RemindersDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
