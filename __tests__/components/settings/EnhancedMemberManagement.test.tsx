// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/usePresence', () => ({
  usePresence: vi.fn(() => ({
    members: [],
    onlineCount: 0,
    isLoading: false,
    error: null,
    refreshPresence: vi.fn(),
  })),
}));

vi.mock('@/components/presence/MemberListItem', () => ({
  MemberListItem: ({ member }: { member: { user_id: string } }) => (
    <div data-testid={`member-${member.user_id}`}>Member</div>
  ),
}));

vi.mock('@/components/presence/PresenceIndicator', () => ({
  PresenceIndicator: ({ status }: { status: string }) => (
    <div data-testid={`presence-${status}`} />
  ),
}));

vi.mock('@/lib/services/invitations-service', () => ({
  getPendingInvitations: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('@/lib/services/member-management-service', () => ({
  removeMember: vi.fn().mockResolvedValue({ success: true }),
  changeMemberRole: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/types', () => ({
  PresenceStatus: { ONLINE: 'online', OFFLINE: 'offline' },
}));

import { EnhancedMemberManagement } from '@/components/settings/EnhancedMemberManagement';

describe('EnhancedMemberManagement', () => {
  const defaultProps = {
    spaceId: 'space-1',
    currentUserId: 'user-1',
    currentUserRole: 'owner',
    onInviteClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<EnhancedMemberManagement {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays Space Members heading', () => {
    render(<EnhancedMemberManagement {...defaultProps} />);
    expect(screen.getByText('Space Members')).toBeTruthy();
  });

  it('displays Active Members section', () => {
    render(<EnhancedMemberManagement {...defaultProps} />);
    expect(screen.getByText('Active Members')).toBeTruthy();
  });

  it('renders Invite Member button', () => {
    render(<EnhancedMemberManagement {...defaultProps} />);
    expect(screen.getByText('Invite Member')).toBeTruthy();
  });

  it('shows empty state when no members', () => {
    render(<EnhancedMemberManagement {...defaultProps} />);
    expect(screen.getByText('No members found.')).toBeTruthy();
  });

  it('shows online count', () => {
    render(<EnhancedMemberManagement {...defaultProps} />);
    expect(screen.getByText(/online/)).toBeTruthy();
  });
});
