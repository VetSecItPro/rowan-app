// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: object, tag: string) =>
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(tag as keyof JSX.IntrinsicElements, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useScrollLock', () => ({
  useScrollLock: vi.fn(),
}));

import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('renders title', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeDefined();
  });

  it('renders children', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders close button by default', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByLabelText('Close modal')).toBeDefined();
  });

  it('hides close button when hideCloseButton is true', () => {
    render(<Modal {...defaultProps} hideCloseButton />);
    expect(screen.queryByLabelText('Close modal')).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders subtitle when provided', () => {
    render(<Modal {...defaultProps} subtitle="A subtitle" />);
    expect(screen.getByText('A subtitle')).toBeDefined();
  });

  it('renders footer when provided', () => {
    render(<Modal {...defaultProps} footer={<button>Save</button>} />);
    expect(screen.getByText('Save')).toBeDefined();
  });

  it('renders with testId attribute', () => {
    render(<Modal {...defaultProps} testId="my-modal" />);
    expect(screen.getByTestId('my-modal')).toBeDefined();
  });

  it('has aria-modal attribute', () => {
    render(<Modal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
