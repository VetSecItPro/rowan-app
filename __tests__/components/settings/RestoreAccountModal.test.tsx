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
    json: vi.fn().mockResolvedValue({ success: true }),
  }),
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

import { RestoreAccountModal } from '@/components/settings/RestoreAccountModal';

describe('RestoreAccountModal', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    deletionRequestedAt: pastDate,
    permanentDeletionAt: futureDate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<RestoreAccountModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<RestoreAccountModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays Account Marked for Deletion title', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText('Account Marked for Deletion')).toBeTruthy();
  });

  it('shows scheduled for deletion warning', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText(/scheduled for deletion/)).toBeTruthy();
  });

  it('renders Restore My Account button', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText('Restore My Account')).toBeTruthy();
  });

  it('renders Continue to Dashboard button', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText('Continue to Dashboard')).toBeTruthy();
  });

  it('calls onClose when Continue to Dashboard is clicked', () => {
    const onClose = vi.fn();
    render(<RestoreAccountModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Continue to Dashboard'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Restore your account now section', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText('Restore your account now')).toBeTruthy();
  });

  it('shows No Data Loss benefit', () => {
    render(<RestoreAccountModal {...defaultProps} />);
    expect(screen.getByText('No Data Loss')).toBeTruthy();
  });
});
