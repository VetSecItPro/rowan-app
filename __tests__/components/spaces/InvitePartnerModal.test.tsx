// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      success: true,
      data: { email_sent: true, invitation_url: 'https://app.example.com/invite/abc123' },
    }),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: { isOpen: boolean; children: React.ReactNode; title: string; subtitle?: string; footer?: React.ReactNode }) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
        {footer}
      </div>
    ) : null,
}));

import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';

describe('InvitePartnerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    spaceId: 'space-1',
    spaceName: 'Johnson Family',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    const { container } = render(<InvitePartnerModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<InvitePartnerModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Invite to Space title', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Invite to Space')).toBeTruthy();
  });

  it('shows Email Address label', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Email Address *')).toBeTruthy();
  });

  it('shows Role label', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Role *')).toBeTruthy();
  });

  it('shows Cancel button', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('shows Send Invitation button', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Send Invitation')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<InvitePartnerModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows email placeholder', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('partner@example.com')).toBeTruthy();
  });

  it('shows Member and Admin role options', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText('Member')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('shows role descriptions', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText(/Can view and collaborate/)).toBeTruthy();
  });

  it('shows email delivery info text', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    expect(screen.getByText(/receive an email with a link/)).toBeTruthy();
  });

  it('allows typing in email field', () => {
    render(<InvitePartnerModal {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText('partner@example.com') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'partner@example.com' } });
    expect(emailInput.value).toBe('partner@example.com');
  });
});
