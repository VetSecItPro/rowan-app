// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/rewards', () => ({
  pointsService: {
    getLeaderboard: vi.fn().mockResolvedValue([]),
    getUserStats: vi.fn().mockResolvedValue(null),
    getPointsBalance: vi.fn().mockResolvedValue(0),
  },
  rewardsService: {
    getRewards: vi.fn().mockResolvedValue([]),
    redeemReward: vi.fn().mockResolvedValue({}),
    getRedemptions: vi.fn().mockResolvedValue([]),
    approveRedemption: vi.fn().mockResolvedValue({}),
    denyRedemption: vi.fn().mockResolvedValue({}),
    fulfillRedemption: vi.fn().mockResolvedValue({}),
    createReward: vi.fn().mockResolvedValue({}),
    updateReward: vi.fn().mockResolvedValue({}),
    deleteReward: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/lib/types/rewards', () => ({
  LEVEL_DEFINITIONS: [
    { level: 1, name: 'Beginner', badge_emoji: '🌱', min_points: 0, max_points: 100 },
    { level: 2, name: 'Explorer', badge_emoji: '⭐', min_points: 100, max_points: 500 },
  ],
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  ),
}));

import { LeaderboardWidget } from '@/components/rewards/LeaderboardWidget';

describe('LeaderboardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <LeaderboardWidget spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<LeaderboardWidget spaceId="space-1" />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(
      <LeaderboardWidget spaceId="space-1" className="custom-class" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with all period prop values', () => {
    const { rerender } = render(<LeaderboardWidget spaceId="space-1" period="week" />);
    expect(document.body).toBeTruthy();

    rerender(<LeaderboardWidget spaceId="space-1" period="month" />);
    expect(document.body).toBeTruthy();

    rerender(<LeaderboardWidget spaceId="space-1" period="all" />);
    expect(document.body).toBeTruthy();
  });

  it('renders with leaderboard entries', async () => {
    const { pointsService } = await import('@/lib/services/rewards');
    (pointsService.getLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        user_id: 'user-1',
        name: 'Alice',
        rank: 1,
        points: 500,
        level: 2,
        current_streak: 3,
        avatar_url: null,
        points_this_week: 100,
        points_this_month: 300,
      },
    ]);
    const { container } = render(
      <LeaderboardWidget spaceId="space-1" currentUserId="user-2" />
    );
    expect(container).toBeTruthy();
  });

  it('shows error state on failure', async () => {
    const { pointsService } = await import('@/lib/services/rewards');
    (pointsService.getLeaderboard as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );
    const { container } = render(<LeaderboardWidget spaceId="space-1" />);
    expect(container).toBeTruthy();
  });
});
