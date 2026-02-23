// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) =>
    React.createElement('img', { src, alt, ...props }),
}));

vi.mock('@/components/presence/PresenceIndicator', () => ({
  PresenceIndicator: ({ status }: { status: string }) =>
    React.createElement('span', { 'data-testid': 'presence-indicator', 'data-status': status }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import type { SpaceMemberWithPresence } from '@/lib/types';

const baseMember: SpaceMemberWithPresence = {
  id: 'member-1',
  user_id: 'user-2',
  space_id: 'space-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'member',
  avatar_url: null,
  presence_status: 'online',
  last_activity: null,
};

describe('MemberListItem', () => {
  it('renders without crashing', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    const { container } = render(<MemberListItem member={baseMember} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders member name', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} />);
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('renders member email', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} />);
    expect(screen.getByText('jane@example.com')).toBeTruthy();
  });

  it('renders Member role label', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} />);
    expect(screen.getByText('Member')).toBeTruthy();
  });

  it('renders Owner role label for owner', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={{ ...baseMember, role: 'owner' }} />);
    expect(screen.getByText('Owner')).toBeTruthy();
  });

  it('renders (You) indicator for current user', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} currentUserId="user-2" />);
    expect(screen.getByText('(You)')).toBeTruthy();
  });

  it('renders online status text when online', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} />);
    expect(screen.getByText('• Online')).toBeTruthy();
  });

  it('shows actions menu when showActions and canManage and not current user', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(
      <MemberListItem
        member={baseMember}
        currentUserId="user-1"
        currentUserRole="owner"
        showActions={true}
        onRemoveMember={vi.fn()}
      />
    );
    const menuBtn = screen.getByRole('button');
    fireEvent.click(menuBtn);
    expect(screen.getByText('Remove')).toBeTruthy();
  });

  it('does not show actions for current user', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(
      <MemberListItem
        member={baseMember}
        currentUserId="user-2"
        currentUserRole="owner"
        showActions={true}
      />
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders avatar initial when no avatar_url', async () => {
    const { MemberListItem } = await import('@/components/presence/MemberListItem');
    render(<MemberListItem member={baseMember} />);
    expect(screen.getByText('J')).toBeTruthy();
  });
});
