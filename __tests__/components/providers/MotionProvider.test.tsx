// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  MotionConfig: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({} as Record<string, React.FC>, {
    get: (_target, tag: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MotionProvider } from '@/components/providers/MotionProvider';

describe('MotionProvider', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MotionProvider>
        <div>test</div>
      </MotionProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renders children', () => {
    render(
      <MotionProvider>
        <span data-testid="child-content">Hello World</span>
      </MotionProvider>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('passes children through MotionConfig', () => {
    render(
      <MotionProvider>
        <div data-testid="nested">Nested content</div>
      </MotionProvider>
    );
    expect(screen.getByTestId('nested')).toBeTruthy();
  });
});
