// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/achievement-badges-service', () => ({}));
vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

import { BadgeCard } from '@/components/achievements/BadgeCard';
import type { AchievementBadge, UserAchievement } from '@/lib/services/achievement-badges-service';

const mockBadge: AchievementBadge = {
  id: 'badge-1',
  name: 'Goal Setter',
  description: 'Set your first goal',
  rarity: 'common',
  points: 50,
  category: 'goals',
  criteria: { type: 'goals_completed', count: 1 },
  color: 'blue',
  is_secret: false,
  created_at: '2024-01-01T00:00:00Z',
};

const mockAchievement: UserAchievement = {
  id: 'ua-1',
  badge_id: 'badge-1',
  user_id: 'user-1',
  space_id: 'space-1',
  earned_at: '2024-06-01T10:00:00Z',
  progress_data: {},
};

describe('BadgeCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<BadgeCard badge={mockBadge} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays badge name when not locked', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('Goal Setter')).toBeTruthy();
  });

  it('displays badge description when not locked', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('Set your first goal')).toBeTruthy();
  });

  it('displays rarity label', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('common')).toBeTruthy();
  });

  it('displays points when not locked', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('50pts')).toBeTruthy();
  });

  it('shows earned indicator when userAchievement is provided', () => {
    const { container } = render(
      <BadgeCard badge={mockBadge} userAchievement={mockAchievement} />
    );
    // Earned indicator is a green circle with trophy
    expect(container.querySelector('.bg-green-500')).toBeTruthy();
  });

  it('shows lock indicator for secret badges not earned', () => {
    const secretBadge = { ...mockBadge, is_secret: true };
    const { container } = render(<BadgeCard badge={secretBadge} />);
    expect(container.querySelector('.bg-gray-400')).toBeTruthy();
  });

  it('shows ??? as name for locked secret badges', () => {
    const secretBadge = { ...mockBadge, is_secret: true };
    render(<BadgeCard badge={secretBadge} />);
    expect(screen.getByText('???')).toBeTruthy();
  });

  it('shows Secret Badge description for locked badges', () => {
    const secretBadge = { ...mockBadge, is_secret: true };
    render(<BadgeCard badge={secretBadge} />);
    expect(screen.getByText('Secret Badge')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<BadgeCard badge={mockBadge} onClick={onClick} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows progress bar when progress is provided and badge not earned', () => {
    const progress = { current: 3, target: 10, percentage: 30 };
    const { container } = render(
      <BadgeCard badge={mockBadge} progress={progress} showProgress={true} />
    );
    expect(container.querySelector('.bg-gray-700')).toBeTruthy();
  });

  it('shows earned date for medium+ size when earned', () => {
    render(
      <BadgeCard badge={mockBadge} userAchievement={mockAchievement} size="medium" />
    );
    expect(screen.getByText(/Earned/)).toBeTruthy();
  });

  it('does not show earned date for small size', () => {
    render(
      <BadgeCard badge={mockBadge} userAchievement={mockAchievement} size="small" />
    );
    expect(screen.queryByText(/Earned/)).toBeNull();
  });

  it('applies correct size classes for large', () => {
    const { container } = render(<BadgeCard badge={mockBadge} size="large" />);
    expect(container.querySelector('.p-6')).toBeTruthy();
  });

  it('does not show progress bar when badge is earned', () => {
    const progress = { current: 3, target: 10, percentage: 30 };
    const { container } = render(
      <BadgeCard
        badge={mockBadge}
        userAchievement={mockAchievement}
        progress={progress}
        showProgress={true}
      />
    );
    // Progress bar wrapper not rendered when earned
    expect(container.querySelector('.flex.justify-between.text-xs.text-gray-400')).toBeNull();
  });
});
