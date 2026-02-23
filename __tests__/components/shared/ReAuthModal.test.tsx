// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

import { ReAuthModal } from '@/components/shared/ReAuthModal';

describe('ReAuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<ReAuthModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<ReAuthModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays default title', () => {
    render(<ReAuthModal {...defaultProps} />);
    expect(screen.getByText('Confirm Your Identity')).toBeTruthy();
  });

  it('displays custom title', () => {
    render(<ReAuthModal {...defaultProps} title="Delete Account" />);
    expect(screen.getByText('Delete Account')).toBeTruthy();
  });

  it('renders Current Password label', () => {
    render(<ReAuthModal {...defaultProps} />);
    expect(screen.getByLabelText('Current Password')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<ReAuthModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Confirm button', () => {
    render(<ReAuthModal {...defaultProps} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ReAuthModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('confirm button is disabled when password is empty', () => {
    render(<ReAuthModal {...defaultProps} />);
    const submitBtn = screen.getByText('Confirm').closest('button')!;
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });

  it('toggles password visibility', () => {
    render(<ReAuthModal {...defaultProps} />);
    const passwordInput = screen.getByLabelText('Current Password');
    expect(passwordInput.getAttribute('type')).toBe('password');
    const toggleBtn = screen.getByLabelText('Show password');
    fireEvent.click(toggleBtn);
    expect(passwordInput.getAttribute('type')).toBe('text');
  });
});
