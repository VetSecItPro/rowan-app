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

  it('has role button', () => {
    render(<MagneticButton>Button</MagneticButton>);
    expect(screen.getByRole('button')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<MagneticButton onClick={onClick}>Click</MagneticButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    render(<MagneticButton className="custom-magnetic">Label</MagneticButton>);
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
