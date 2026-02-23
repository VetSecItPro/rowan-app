// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@headlessui/react', () => ({
  Transition: ({ show, children }: { show: boolean; children: React.ReactNode }) =>
    show ? <>{children}</> : null,
}));

vi.mock('@/lib/services/achievement-badges-service', () => ({}));
vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

import { AchievementNotification } from '@/components/achievements/AchievementNotification';
import type { UserAchievement, AchievementBadge } from '@/lib/services/achievement-badges-service';

const mockBadge: AchievementBadge = {
  id: 'badge-1',
  name: 'First Goal',
  description: 'Complete your first goal',
  rarity: 'common',
  points: 100,
  category: 'goals',
  criteria: { type: 'goals_completed', count: 1 },
  color: 'blue',
  is_secret: false,
  created_at: '2024-01-01T00:00:00Z',
};

const mockAchievement: UserAchievement & { badge: AchievementBadge } = {
  id: 'achievement-1',
  badge_id: 'badge-1',
  user_id: 'user-1',
  space_id: 'space-1',
  earned_at: '2024-01-15T10:00:00Z',
  progress_data: {},
  badge: mockBadge,
};

describe('AchievementNotification', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it('renders without crashing when visible', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(screen.getByText('Achievement Unlocked!')).toBeTruthy();
  });

  it('displays badge name and description', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(screen.getByText('First Goal')).toBeTruthy();
    expect(screen.getByText('Complete your first goal')).toBeTruthy();
  });

  it('displays badge points', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(screen.getByText('100 points earned')).toBeTruthy();
  });

  it('displays rarity label', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(screen.getByText('common')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isVisible is false', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={false}
        onClose={onClose}
      />
    );
    expect(screen.queryByText('Achievement Unlocked!')).toBeNull();
  });

  it('auto-closes after duration', () => {
    const onClose = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        isVisible={true}
        onClose={onClose}
        duration={3000}
      />
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders celebration effects for epic rarity', () => {
    const epicAchievement = {
      ...mockAchievement,
      badge: { ...mockBadge, rarity: 'epic' as const },
    };
    const onClose = vi.fn();
    const { container } = render(
      <AchievementNotification
        achievement={epicAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(container.querySelector('.animate-ping')).toBeTruthy();
  });

  it('renders celebration effects for legendary rarity', () => {
    const legendaryAchievement = {
      ...mockAchievement,
      badge: { ...mockBadge, rarity: 'legendary' as const },
    };
    const onClose = vi.fn();
    const { container } = render(
      <AchievementNotification
        achievement={legendaryAchievement}
        isVisible={true}
        onClose={onClose}
      />
    );
    expect(container.querySelector('.animate-ping')).toBeTruthy();
  });
});
