// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', email: 'test@example.com' }, session: null, loading: false, signOut: vi.fn() })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/services/account-deletion-service', () => ({
  accountDeletionService: {
    deleteUserAccount: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
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

import { AccountDeletionModal } from '@/components/settings/AccountDeletionModal';

describe('AccountDeletionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<AccountDeletionModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<AccountDeletionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays the modal title', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('Delete Account')).toBeTruthy();
  });

  it('displays the warning about permanent deletion', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('Permanent Account Deletion')).toBeTruthy();
  });

  it('displays the 30-day grace period information', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('30-Day Grace Period')).toBeTruthy();
  });

  it('renders Export All Data button', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('Export All Data')).toBeTruthy();
  });

  it('renders Delete My Account button', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('Delete My Account')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<AccountDeletionModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('displays GDPR compliance message', () => {
    render(<AccountDeletionModal {...defaultProps} />);
    expect(screen.getByText(/GDPR Article 17/)).toBeTruthy();
  });
});
