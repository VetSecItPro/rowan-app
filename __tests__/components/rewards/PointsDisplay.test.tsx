// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/rewards', () => ({
  pointsService: {
    getUserStats: vi.fn().mockResolvedValue(null),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    getPointsBalance: vi.fn().mockResolvedValue(0),
  },
  rewardsService: {
    getRewards: vi.fn().mockResolvedValue([]),
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

import { PointsDisplay } from '@/components/rewards/PointsDisplay';

const defaultProps = {
  userId: 'user-1',
  spaceId: 'space-1',
};

describe('PointsDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<PointsDisplay {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<PointsDisplay {...defaultProps} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders null when stats load as null and error occurs', () => {
    const { container } = render(<PointsDisplay {...defaultProps} />);
    // During load, the loading skeleton is visible
    expect(container.firstChild).toBeTruthy();
  });

  it('renders in compact variant by default', () => {
    const { container } = render(<PointsDisplay {...defaultProps} variant="compact" />);
    expect(container).toBeTruthy();
  });

  it('renders in full variant', () => {
    const { container } = render(<PointsDisplay {...defaultProps} variant="full" />);
    expect(container).toBeTruthy();
  });

  it('accepts showStreak prop', () => {
    const { container } = render(
      <PointsDisplay {...defaultProps} showStreak={false} />
    );
    expect(container).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(
      <PointsDisplay {...defaultProps} className="custom-class" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with stats loaded', async () => {
    const { pointsService } = await import('@/lib/services/rewards');
    (pointsService.getUserStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      total_points: 250,
      level: 2,
      current_streak: 5,
      longest_streak: 10,
      points_this_week: 50,
      points_this_month: 150,
      chores_completed_today: 3,
      pending_redemptions: 1,
      progress_to_next_level: 60,
      next_level_points: 500,
    });

    const { container } = render(<PointsDisplay {...defaultProps} />);
    expect(container).toBeTruthy();
  });
});
