// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('date-fns', () => ({ format: vi.fn(() => 'January 15, 2026') }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/lib/native/share', () => ({
  shareContent: vi.fn(),
  canShare: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('@/lib/utils/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

import BadgeNotification from '@/components/goals/badges/BadgeNotification';
import type { UserBadge } from '@/lib/services/achievement-service';

const mockUserBadge: UserBadge = {
  id: 'user-badge-1',
  user_id: 'user-1',
  badge_id: 'badge-1',
  space_id: 'space-1',
  earned_at: '2026-01-15T00:00:00Z',
  badge: {
    id: 'badge-1',
    name: 'First Goal',
    description: 'Complete your first goal',
    icon: '🎯',
    category: 'goals',
    rarity: 'common',
    points: 10,
    criteria: {},
    created_at: '2026-01-01T00:00:00Z',
  },
};

describe('BadgeNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders without crashing', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose={false} />
    );
    expect(container).toBeTruthy();
  });

  it('shows badge name after entrance animation', async () => {
    const onClose = vi.fn();
    render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose={false} />
    );
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(screen.getByText('First Goal')).toBeTruthy();
  });

  it('shows badge icon', async () => {
    const onClose = vi.fn();
    render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose={false} />
    );
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(screen.getByText('🎯')).toBeTruthy();
  });

  it('shows achievement unlocked header', async () => {
    const onClose = vi.fn();
    render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose={false} />
    );
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(screen.getByText('Achievement Unlocked!')).toBeTruthy();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose={false} />
    );
    await act(async () => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByText('Close'));
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after delay', async () => {
    const onClose = vi.fn();
    render(
      <BadgeNotification badge={mockUserBadge} onClose={onClose} autoClose autoCloseDelay={1000} />
    );
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when badge has no badge data', () => {
    const onClose = vi.fn();
    const badgeWithoutData = { ...mockUserBadge, badge: undefined };
    const { container } = render(
      <BadgeNotification badge={badgeWithoutData as UserBadge} onClose={onClose} autoClose={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
