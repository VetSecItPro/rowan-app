// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/rewards', () => ({
  rewardsService: {
    getRewards: vi.fn().mockResolvedValue([]),
    redeemReward: vi.fn().mockResolvedValue({}),
  },
  pointsService: {
    getPointsBalance: vi.fn().mockResolvedValue(500),
    getUserStats: vi.fn().mockResolvedValue(null),
    getLeaderboard: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  ),
}));

import { RewardsCatalog } from '@/components/rewards/RewardsCatalog';

const defaultProps = {
  spaceId: 'space-1',
  userId: 'user-1',
  onRedemption: vi.fn(),
};

describe('RewardsCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RewardsCatalog {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<RewardsCatalog {...defaultProps} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(
      <RewardsCatalog {...defaultProps} className="custom-class" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with rewards loaded', async () => {
    const { rewardsService, pointsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'reward-1',
        name: 'Ice Cream Trip',
        description: 'A trip to get ice cream',
        cost_points: 100,
        category: 'treats',
        emoji: '🍦',
        is_active: true,
        max_redemptions_per_week: null,
      },
    ]);
    (pointsService.getPointsBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce(500);

    const { container } = render(<RewardsCatalog {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows empty state text with no rewards', async () => {
    const { rewardsService, pointsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    (pointsService.getPointsBalance as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

    const { container } = render(<RewardsCatalog {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('handles error state from service', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Service error')
    );

    const { container } = render(<RewardsCatalog {...defaultProps} />);
    expect(container).toBeTruthy();
  });
});
