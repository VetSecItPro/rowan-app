// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('button', props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { LoadMoreButton } from '@/components/ui/LoadMoreButton';

describe('LoadMoreButton', () => {
  const defaultProps = {
    remaining: 10,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<LoadMoreButton {...defaultProps} />);
    expect(screen.getByText('Show 10 more')).toBeDefined();
  });

  it('shows remaining count in button text', () => {
    render(<LoadMoreButton remaining={25} onClick={vi.fn()} />);
    expect(screen.getByText('Show 25 more')).toBeDefined();
  });

  it('calls onClick when clicked', () => {
    render(<LoadMoreButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Show 10 more'));
    expect(defaultProps.onClick).toHaveBeenCalledOnce();
  });
});
