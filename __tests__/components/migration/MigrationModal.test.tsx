// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/contexts/spaces-context', () => ({
  useSpaces: vi.fn(() => ({
    spaces: [],
    currentSpace: null,
    refreshSpaces: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/constants/feature-flags', () => ({
  featureFlags: {
    isWorkspaceMigrationEnabled: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@/lib/services/personal-workspace-service', () => ({
  personalWorkspaceService: {
    migrateToSharedSpace: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title }: {
    children: React.ReactNode;
    isOpen: boolean;
    title: string;
  }) => isOpen ? (
    <div data-testid="modal">
      <h2>{title}</h2>
      {children}
    </div>
  ) : null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

import { MigrationModal } from '@/components/migration/MigrationModal';
import type { Space } from '@/lib/types';

const mockTargetSpaces: (Space & { role: string })[] = [
  {
    id: 'space-2',
    name: 'Family Space',
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    invite_code: 'abc123',
    subscription_tier: 'free',
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  targetSpaces: [],
};

describe('MigrationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<MigrationModal {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders the Migrate Personal Workspace title', () => {
    render(<MigrationModal {...defaultProps} />);
    expect(screen.getByText('Migrate Personal Workspace')).toBeTruthy();
  });

  it('renders migration item checkboxes', () => {
    render(<MigrationModal {...defaultProps} />);
    expect(screen.getByText('Tasks & Projects')).toBeTruthy();
    expect(screen.getByText('Calendar Events')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getByText('Shopping Lists')).toBeTruthy();
    expect(screen.getByText('Goals & Habits')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    render(<MigrationModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders Continue button with selection count', () => {
    render(<MigrationModal {...defaultProps} />);
    // All 6 items selected by default
    expect(screen.getByText(/Continue \(6 selected\)/)).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<MigrationModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(<MigrationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('returns null when feature flag is disabled', async () => {
    const { featureFlags } = await import('@/lib/constants/feature-flags');
    (featureFlags.isWorkspaceMigrationEnabled as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const { container } = render(<MigrationModal {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('navigates to target step when Continue is clicked', () => {
    render(<MigrationModal {...defaultProps} targetSpaces={mockTargetSpaces} />);
    fireEvent.click(screen.getByText(/Continue \(6 selected\)/));
    expect(screen.getByText('Choose Destination Workspace')).toBeTruthy();
  });

  it('shows target space in target step', () => {
    render(<MigrationModal {...defaultProps} targetSpaces={mockTargetSpaces} />);
    fireEvent.click(screen.getByText(/Continue \(6 selected\)/));
    expect(screen.getByText('Family Space')).toBeTruthy();
  });

  it('shows no shared workspaces message when targetSpaces is empty', () => {
    render(<MigrationModal {...defaultProps} targetSpaces={[]} />);
    fireEvent.click(screen.getByText(/Continue \(6 selected\)/));
    expect(screen.getByText(/don't have any shared workspaces/)).toBeTruthy();
  });

  it('deselects item when clicking on it', () => {
    render(<MigrationModal {...defaultProps} />);
    // Click on "Tasks & Projects" to deselect it
    const taskItem = screen.getByText('Tasks & Projects').closest('[class*="cursor-pointer"]');
    if (taskItem) fireEvent.click(taskItem);
    // Count should now show 5
    expect(screen.getByText(/Continue \(5 selected\)/)).toBeTruthy();
  });
});
