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

import { PasswordConfirmModal } from '@/components/settings/PasswordConfirmModal';

describe('PasswordConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<PasswordConfirmModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<PasswordConfirmModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays the default title', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm Your Password')).toBeTruthy();
  });

  it('displays a custom title', () => {
    render(<PasswordConfirmModal {...defaultProps} title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeTruthy();
  });

  it('renders the password input', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    expect(screen.getByLabelText('Current Password')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Confirm button', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('renders custom confirm button text', () => {
    render(<PasswordConfirmModal {...defaultProps} confirmButtonText="Delete Account" />);
    expect(screen.getByText('Delete Account')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<PasswordConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('confirm button is disabled when password is empty', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    const confirmButton = screen.getByText('Confirm').closest('button')!;
    expect(confirmButton.hasAttribute('disabled')).toBe(true);
  });

  it('confirm button enables when password is entered', () => {
    render(<PasswordConfirmModal {...defaultProps} />);
    const input = screen.getByLabelText('Current Password');
    fireEvent.change(input, { target: { value: 'mypassword' } });
    const confirmButton = screen.getByText('Confirm').closest('button')!;
    expect(confirmButton.hasAttribute('disabled')).toBe(false);
  });
});
