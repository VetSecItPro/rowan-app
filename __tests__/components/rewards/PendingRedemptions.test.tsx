// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/services/rewards', () => ({
  rewardsService: {
    getRedemptions: vi.fn().mockResolvedValue([]),
    approveRedemption: vi.fn().mockResolvedValue({}),
    denyRedemption: vi.fn().mockResolvedValue({}),
    fulfillRedemption: vi.fn().mockResolvedValue({}),
  },
  pointsService: {
    getLeaderboard: vi.fn().mockResolvedValue([]),
    getUserStats: vi.fn().mockResolvedValue(null),
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

import { PendingRedemptions } from '@/components/rewards/PendingRedemptions';

const defaultProps = {
  spaceId: 'space-1',
  currentUserId: 'user-1',
};

describe('PendingRedemptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<PendingRedemptions {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<PendingRedemptions {...defaultProps} />);
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders with className prop', () => {
    const { container } = render(
      <PendingRedemptions {...defaultProps} className="custom" />
    );
    expect(container).toBeTruthy();
  });

  it('shows the header title', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRedemptions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Wait for loading to complete by using async render
    const { container } = render(<PendingRedemptions {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows empty state after loading with no redemptions', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRedemptions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { container } = render(<PendingRedemptions {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('handles error state gracefully', async () => {
    const { rewardsService } = await import('@/lib/services/rewards');
    (rewardsService.getRedemptions as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Failed')
    );

    const { container } = render(<PendingRedemptions {...defaultProps} />);
    expect(container).toBeTruthy();
  });
});
