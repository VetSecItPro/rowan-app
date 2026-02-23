// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/usePresence', () => ({
  useOnlineCount: vi.fn(() => ({ onlineCount: 2, totalCount: 3, isLoading: false })),
}));

vi.mock('@/components/presence/PresenceIndicator', () => ({
  PresenceIndicator: ({ status }: { status: string }) =>
    React.createElement('span', { 'data-testid': 'presence-indicator', 'data-status': status }),
}));

vi.mock('@/lib/types', () => ({
  PresenceStatus: { ONLINE: 'online', OFFLINE: 'offline' },
}));

describe('HeaderMemberIndicator', () => {
  it('renders without crashing with a spaceId', async () => {
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    const { container } = render(<HeaderMemberIndicator spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('returns null when spaceId is null', async () => {
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    const { container } = render(<HeaderMemberIndicator spaceId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders online member count', async () => {
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    render(<HeaderMemberIndicator spaceId="space-1" spaceName="My Home" />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders total member count', async () => {
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    render(<HeaderMemberIndicator spaceId="space-1" spaceName="My Home" />);
    expect(screen.getByText('/3')).toBeTruthy();
  });

  it('shows single user indicator when totalCount is 1', async () => {
    const { useOnlineCount } = await import('@/hooks/usePresence');
    vi.mocked(useOnlineCount).mockReturnValue({ onlineCount: 1, totalCount: 1, isLoading: false });
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    render(<HeaderMemberIndicator spaceId="space-1" spaceName="My Home" />);
    expect(screen.getByText('My Home')).toBeTruthy();
  });

  it('returns null while loading', async () => {
    const { useOnlineCount } = await import('@/hooks/usePresence');
    vi.mocked(useOnlineCount).mockReturnValue({ onlineCount: 0, totalCount: 0, isLoading: true });
    const { HeaderMemberIndicator } = await import('@/components/presence/HeaderMemberIndicator');
    const { container } = render(<HeaderMemberIndicator spaceId="space-1" />);
    expect(container.firstChild).toBeNull();
  });
});
