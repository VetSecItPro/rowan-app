// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => React.createElement(tag as string, props, children) }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useInView: vi.fn(() => true),
  useReducedMotion: vi.fn(() => false),
}));

import HeroDemoAnimation from '@/components/home/HeroDemoAnimation';

describe('HeroDemoAnimation', () => {
  it('renders without crashing', () => {
    const { container } = render(<HeroDemoAnimation />);
    expect(container).toBeTruthy();
  });

  it('renders a container element', () => {
    const { container } = render(<HeroDemoAnimation />);
    expect(container.firstChild).toBeTruthy();
  });
});
