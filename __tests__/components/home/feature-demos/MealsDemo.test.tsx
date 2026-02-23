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

import { MealsDemo } from '@/components/home/feature-demos/MealsDemo';

describe('MealsDemo', () => {
  it('renders without crashing', () => {
    const { container } = render(<MealsDemo />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<MealsDemo />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the first step label', () => {
    render(<MealsDemo />);
    expect(screen.getByText('Your meal week')).toBeTruthy();
  });

  it('renders meal names in the week calendar', () => {
    render(<MealsDemo />);
    expect(screen.getByText('Oatmeal')).toBeTruthy();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<MealsDemo className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
