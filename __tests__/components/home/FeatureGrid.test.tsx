// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  useInView: vi.fn(() => true),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

// FeatureGrid imports feature-demos
vi.mock('@/components/home/feature-demos/TasksDemo', () => ({ TasksDemo: () => <div>tasks</div> }));
vi.mock('@/components/home/feature-demos/CalendarDemo', () => ({ CalendarDemo: () => <div>calendar</div> }));
vi.mock('@/components/home/feature-demos/ShoppingDemo', () => ({ ShoppingDemo: () => <div>shopping</div> }));
vi.mock('@/components/home/feature-demos/MealsDemo', () => ({ MealsDemo: () => <div>meals</div> }));
vi.mock('@/components/home/feature-demos/ChoresDemo', () => ({ ChoresDemo: () => <div>chores</div> }));

import { FeatureGrid } from '@/components/home/FeatureGrid';

describe('FeatureGrid', () => {
  it('renders without crashing', () => {
    const { container } = render(<FeatureGrid />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<FeatureGrid />);
    expect(container.firstChild).toBeTruthy();
  });
});
