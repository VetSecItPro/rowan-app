// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@radix-ui/react-scroll-area', () => ({
  Root: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
      <div ref={ref} className={className} data-testid="scroll-area-root" {...props}>{children}</div>
    )
  ),
  Viewport: ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={className} data-testid="scroll-area-viewport">{children}</div>
  ),
  ScrollAreaScrollbar: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { orientation?: string }>(
    ({ className, children }, ref) => (
      <div ref={ref} className={className} data-testid="scrollbar">{children}</div>
    )
  ),
  ScrollAreaThumb: () => <div data-testid="scrollbar-thumb" />,
  Corner: () => <div data-testid="scroll-corner" />,
}));

import { vi } from 'vitest';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

describe('ScrollArea', () => {
  it('renders without crashing', () => {
    render(<ScrollArea><p>Scrollable content</p></ScrollArea>);
    expect(screen.getByTestId('scroll-area-root')).toBeDefined();
  });

  it('renders children inside viewport', () => {
    render(<ScrollArea><p>Content</p></ScrollArea>);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<ScrollArea className="my-scroll"><p>Content</p></ScrollArea>);
    expect(screen.getByTestId('scroll-area-root').className).toContain('my-scroll');
  });
});

describe('ScrollBar', () => {
  it('renders without crashing', () => {
    render(<ScrollBar />);
    expect(screen.getByTestId('scrollbar')).toBeDefined();
  });
});
