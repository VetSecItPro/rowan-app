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

import { CalendarDemo } from '@/components/home/feature-demos/CalendarDemo';

describe('CalendarDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<CalendarDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<CalendarDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders calendar demo step content', () => {
    render(<CalendarDemo />);
    expect(screen.getByText('Your week at a glance')).toBeTruthy();
  });

  it('renders day abbreviations in the week view', () => {
    render(<CalendarDemo />);
    expect(screen.getAllByText('Mon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fri').length).toBeGreaterThan(0);
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<CalendarDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
