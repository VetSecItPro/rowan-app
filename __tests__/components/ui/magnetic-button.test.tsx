// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
      style?: React.CSSProperties;
      'data-testid'?: string;
    }>(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  useMotionValue: vi.fn(() => ({
    set: vi.fn(),
    get: vi.fn(() => 0),
  })),
  useSpring: vi.fn((val: unknown) => val),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MagneticButton } from '@/components/ui/magnetic-button';

describe('MagneticButton', () => {
  it('renders without crashing', () => {
    render(<MagneticButton>Click me</MagneticButton>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('renders children', () => {
    render(<MagneticButton><span>Child</span></MagneticButton>);
    expect(screen.getByText('Child')).toBeDefined();
  });

  it('has role button when it is the control (onClick provided)', () => {
    render(<MagneticButton onClick={vi.fn()}>Button</MagneticButton>);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('is presentational (no button role) when wrapping an inner interactive', () => {
    // a11y (nested-interactive): without onClick, MagneticButton must NOT be a
    // button - it wraps an inner <Link>/<button> which carries the semantics.
    const { container } = render(
      <MagneticButton><a href="/x">Inner link</a></MagneticButton>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect((container.firstChild as HTMLElement).getAttribute('tabindex')).toBeNull();
    // The inner interactive is still present + reachable.
    expect(screen.getByRole('link')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<MagneticButton onClick={onClick}>Click</MagneticButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    render(<MagneticButton onClick={vi.fn()} className="custom-magnetic">Label</MagneticButton>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-magnetic');
  });

  it('renders with testId when provided', () => {
    render(<MagneticButton testId="mag-btn">Label</MagneticButton>);
    expect(screen.getByTestId('mag-btn')).toBeDefined();
  });

  it('calls onClick on Enter key press', () => {
    const onClick = vi.fn();
    render(<MagneticButton onClick={onClick}>Label</MagneticButton>);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick on Space key press', () => {
    const onClick = vi.fn();
    render(<MagneticButton onClick={onClick}>Label</MagneticButton>);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(onClick).toHaveBeenCalledOnce();
  });
});
