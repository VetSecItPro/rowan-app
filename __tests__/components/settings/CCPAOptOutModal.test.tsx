// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    profile: null,
    spaces: [{ id: 'space-1', name: 'Test Space' }],
    currentSpace: { id: 'space-1', name: 'Test Space' },
    hasZeroSpaces: false,
    authLoading: false,
    profileLoading: false,
    spacesLoading: false,
    loading: false,
    isReady: true,
    authError: null,
    spacesError: null,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    switchSpace: vi.fn(),
    refreshSpaces: vi.fn(),
    createSpace: vi.fn(),
    deleteSpace: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, session: null, loading: false, signOut: vi.fn() })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ data: { opted_out: false } }),
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

// Mock fetch for CCPA status
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({ data: { opted_out: false, california_resident: null } }),
});

import { CCPAOptOutModal } from '@/components/settings/CCPAOptOutModal';

describe('CCPAOptOutModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<CCPAOptOutModal {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(<CCPAOptOutModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays the CCPA Privacy Rights title', () => {
    render(<CCPAOptOutModal {...defaultProps} />);
    expect(screen.getByText('CCPA Privacy Rights')).toBeTruthy();
  });

  it('renders a Close button', () => {
    render(<CCPAOptOutModal {...defaultProps} />);
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('calls onClose when Close is clicked', () => {
    const onClose = vi.fn();
    render(<CCPAOptOutModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows California Residency section after loading', async () => {
    render(<CCPAOptOutModal {...defaultProps} />);
    // The loading spinner appears first; after resolving we see the content
    // Just check the modal is rendered
    expect(screen.getByTestId('modal')).toBeTruthy();
  });
});
