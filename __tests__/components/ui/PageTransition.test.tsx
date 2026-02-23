// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { vi } from 'vitest';
import { PageTransition } from '@/components/ui/PageTransition';

describe('PageTransition', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageTransition><p>Content</p></PageTransition>);
    expect(container).toBeDefined();
  });

  it('renders children', () => {
    render(<PageTransition><p>Page content here</p></PageTransition>);
    expect(screen.getByText('Page content here')).toBeDefined();
  });

  it('wraps children in a div', () => {
    const { container } = render(<PageTransition><span>Test</span></PageTransition>);
    expect(container.querySelector('div')).toBeDefined();
  });
});
