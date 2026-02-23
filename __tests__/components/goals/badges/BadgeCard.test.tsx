// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Jan 1, 2026'),
}));

import BadgeCard from '@/components/goals/badges/BadgeCard';
import type { AchievementBadge, UserBadge } from '@/lib/services/achievement-service';

const mockBadge: AchievementBadge = {
  id: 'badge-1',
  name: 'First Goal',
  description: 'Complete your first goal',
  icon: '🎯',
  category: 'goals',
  rarity: 'common',
  points: 10,
  criteria: {},
  created_at: '2026-01-01T00:00:00Z',
};

const mockUserBadge: UserBadge = {
  id: 'user-badge-1',
  user_id: 'user-1',
  badge_id: 'badge-1',
  space_id: 'space-1',
  earned_at: '2026-01-15T00:00:00Z',
  badge: mockBadge,
};

describe('BadgeCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<BadgeCard badge={mockBadge} />);
    expect(container).toBeTruthy();
  });

  it('renders the badge name', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('First Goal')).toBeTruthy();
  });

  it('renders the badge description', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('Complete your first goal')).toBeTruthy();
  });

  it('renders badge icon', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('🎯')).toBeTruthy();
  });

  it('renders rarity label', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('common')).toBeTruthy();
  });

  it('renders points', () => {
    render(<BadgeCard badge={mockBadge} />);
    expect(screen.getByText('10 points')).toBeTruthy();
  });

  it('renders earned date when userBadge provided', () => {
    render(<BadgeCard badge={mockBadge} userBadge={mockUserBadge} />);
    expect(screen.getByText(/Earned/)).toBeTruthy();
  });

  it('renders locked indicator when not earned', () => {
    const { container } = render(<BadgeCard badge={mockBadge} />);
    expect(container.textContent).toContain('🔒');
  });

  it('toggles details on click', () => {
    render(<BadgeCard badge={mockBadge} />);
    const card = screen.getByText('First Goal').closest('[class*="rounded"]');
    if (card) {
      fireEvent.click(card);
      expect(screen.getByText('Category:')).toBeTruthy();
    }
  });

  it('renders with epic rarity', () => {
    const epicBadge = { ...mockBadge, rarity: 'epic' as const, name: 'Epic Badge' };
    render(<BadgeCard badge={epicBadge} />);
    expect(screen.getByText('epic')).toBeTruthy();
  });

  it('renders with legendary rarity', () => {
    const legendaryBadge = { ...mockBadge, rarity: 'legendary' as const, name: 'Legendary Badge' };
    render(<BadgeCard badge={legendaryBadge} />);
    expect(screen.getByText('legendary')).toBeTruthy();
  });

  it('renders small size variant', () => {
    const { container } = render(<BadgeCard badge={mockBadge} size="small" />);
    expect(container.querySelector('.text-3xl')).toBeTruthy();
  });

  it('renders large size variant', () => {
    const { container } = render(<BadgeCard badge={mockBadge} size="large" />);
    expect(container.querySelector('.text-7xl')).toBeTruthy();
  });

  it('shows progress bar when progress provided and not earned', () => {
    const progress = { current: 3, target: 10, percentage: 30 };
    const { container } = render(<BadgeCard badge={mockBadge} progress={progress} showProgress />);
    expect(container.querySelector('.rounded-full')).toBeTruthy();
  });
});
