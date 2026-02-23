// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/hooks/useActiveSessions', () => ({
  useActiveSessions: vi.fn(() => ({
    activeSessions: [],
    isLoadingSessions: false,
    sessionToRevoke: null,
    setSessionToRevoke: vi.fn(),
    showRevokeSessionModal: false,
    setShowRevokeSessionModal: vi.fn(),
    fetchActiveSessions: vi.fn(),
    handleRevokeSession: vi.fn(),
  })),
}));

vi.mock('@/components/settings/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordForm</div>,
}));

vi.mock('@/components/ui/DynamicSettingsComponents', () => ({
  TwoFactorAuth: () => <div data-testid="two-factor-auth">TwoFactorAuth</div>,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { SecurityTab } from '@/components/settings/SecurityTab';

describe('SecurityTab', () => {
  const defaultProps = {
    userEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SecurityTab {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Security Settings heading', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText('Security Settings')).toBeTruthy();
  });

  it('displays Reset Password section', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText('Reset Password')).toBeTruthy();
  });

  it('displays the user email in reset section', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText(/test@example.com/)).toBeTruthy();
  });

  it('renders Send Reset Email button', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText('Send Reset Email')).toBeTruthy();
  });

  it('renders ChangePasswordForm component', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByTestId('change-password-form')).toBeTruthy();
  });

  it('renders TwoFactorAuth component', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByTestId('two-factor-auth')).toBeTruthy();
  });

  it('displays Active Sessions section', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText('Active Sessions')).toBeTruthy();
  });

  it('shows no active sessions message when sessions list is empty', () => {
    render(<SecurityTab {...defaultProps} />);
    expect(screen.getByText('No active sessions found')).toBeTruthy();
  });
});
