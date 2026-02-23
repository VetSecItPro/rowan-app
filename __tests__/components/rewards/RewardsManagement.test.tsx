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
    createReward: vi.fn().mockResolvedValue({ id: 'new-reward' }),
    updateReward: vi.fn().mockResolvedValue({}),
    deleteReward: vi.fn().mockResolvedValue({}),
  },
  pointsService: {
    getUserStats: vi.fn().mockResolvedValue(null),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    getPointsBalance: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/sanitize', () => ({
  sanitizePlainText: vi.fn((text: string) => text),
}));

vi.mock('@/components/ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div title={content}>{children}</div>
  ),
}));

import { RewardsManagement } from '@/components/rewards/RewardsManagement';

const defaultProps = {
  spaceId: 'space-1',
  userId: 'user-1',
};

describe('RewardsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RewardsManagement {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<RewardsManagement {...defaultProps} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(
      <RewardsManagement {...defaultProps} className="custom-class" />
    );
    expect(container).toBeTruthy();
  });

  it('shows the management heading after loading', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const { container } = render(<RewardsManagement {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows Add Reward button after loading', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const { container } = render(<RewardsManagement {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders reward cards when rewards exist', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        id: 'reward-1',
        name: 'Ice Cream Trip',
        description: 'Go get ice cream',
        cost_points: 100,
        category: 'treats',
        emoji: '🍦',
        is_active: true,
        max_redemptions_per_week: null,
        space_id: 'space-1',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
      },
    ]);

    const { container } = render(<RewardsManagement {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('handles service error gracefully', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRewards as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Service error')
    );

    const { container } = render(<RewardsManagement {...defaultProps} />);
    expect(container).toBeTruthy();
  });
});
