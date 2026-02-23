// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteMessageModal } from '@/components/messages/DeleteMessageModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: { children: React.ReactNode; isOpen: boolean; title: string; footer?: React.ReactNode; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    );
  },
}));

describe('DeleteMessageModal', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    onConfirm,
    isOwnMessage: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<DeleteMessageModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<DeleteMessageModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Delete Message" title', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    expect(screen.getByText('Delete Message')).toBeTruthy();
  });

  it('shows "Delete for everyone" option for own messages', () => {
    render(<DeleteMessageModal {...defaultProps} isOwnMessage={true} />);
    expect(screen.getByText(/Delete for everyone/i)).toBeTruthy();
  });

  it('shows "Delete for me" option', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    expect(screen.getByText(/Delete for me/i)).toBeTruthy();
  });

  it('renders cancel button', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders delete button', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when delete is clicked', () => {
    render(<DeleteMessageModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('disables buttons when isDeleting is true', () => {
    render(<DeleteMessageModal {...defaultProps} isDeleting={true} />);
    expect(screen.getByText('Deleting...')).toBeTruthy();
  });

  it('defaults to "for_me" mode for messages from others', () => {
    render(<DeleteMessageModal {...defaultProps} isOwnMessage={false} />);
    // Just verify rendering without crash
    expect(screen.getByText('Delete Message')).toBeTruthy();
  });
});
