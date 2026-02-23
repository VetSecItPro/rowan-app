// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', { ...props, style: props['style'] as React.CSSProperties }, children),
  },
  useMotionValue: vi.fn(() => ({
    get: vi.fn(() => 0),
    set: vi.fn(),
  })),
  useTransform: vi.fn(() => ({ get: vi.fn(() => 0) })),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SwipeableListItem } from '@/components/ui/SwipeableListItem';

describe('SwipeableListItem', () => {
  const defaultProps = {
    onSwipeLeft: vi.fn(),
    onSwipeRight: vi.fn(),
    children: <div data-testid="item-content">List Item</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByTestId('item-content')).toBeDefined();
  });

  it('renders children', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByText('List Item')).toBeDefined();
  });

  it('renders just children when disabled', () => {
    render(<SwipeableListItem {...defaultProps} disabled={true} />);
    expect(screen.getByText('List Item')).toBeDefined();
  });

  it('has listitem role', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByRole('listitem')).toBeDefined();
  });

  it('is keyboard accessible with tabIndex', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByRole('listitem').getAttribute('tabindex')).toBe('0');
  });

  it('shows left action (complete) background', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByText('Complete')).toBeDefined();
  });

  it('shows right action (delete) background', () => {
    render(<SwipeableListItem {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeDefined();
  });
});
