// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('use-debounce', () => ({ useDebounce: (value: unknown) => [value] }));
vi.mock('@/lib/services/achievement-badges-service', () => ({}));
vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

// Mock child components to reduce test surface
vi.mock('@/components/achievements/BadgeCard', () => ({
  BadgeCard: ({ badge, onClick }: { badge: { name: string }; onClick?: () => void }) => (
    <div data-testid="badge-card" onClick={onClick}>{badge.name}</div>
  ),
}));
vi.mock('@/components/achievements/BadgeModal', () => ({
  BadgeModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="badge-modal"><button onClick={onClose}>Close</button></div> : null,
}));

import { BadgeGallery } from '@/components/achievements/BadgeGallery';
import type { AchievementBadge, UserAchievement } from '@/lib/services/achievement-badges-service';

const makeBadge = (id: string, name: string, category: string, rarity: string): AchievementBadge => ({
  id,
  name,
  description: `Description for ${name}`,
  rarity: rarity as AchievementBadge['rarity'],
  points: 100,
  category: category as AchievementBadge['category'],
  criteria: { type: 'goals_completed', count: 1 },
  color: 'blue',
  is_secret: false,
  created_at: '2024-01-01T00:00:00Z',
});

const badges: AchievementBadge[] = [
  makeBadge('b1', 'Badge One', 'goals', 'common'),
  makeBadge('b2', 'Badge Two', 'milestones', 'rare'),
  makeBadge('b3', 'Badge Three', 'goals', 'epic'),
];

const userAchievements: UserAchievement[] = [
  {
    id: 'ua-1',
    badge_id: 'b1',
    user_id: 'user-1',
    space_id: 'space-1',
    earned_at: '2024-06-01T00:00:00Z',
    progress_data: {},
    badge: badges[0],
  },
];

describe('BadgeGallery', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BadgeGallery badges={badges} userAchievements={[]} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows total badges count', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows earned count from userAchievements', () => {
    render(<BadgeGallery badges={badges} userAchievements={userAchievements} />);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('renders badge cards for each badge', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} />);
    expect(screen.getAllByTestId('badge-card')).toHaveLength(3);
  });

  it('shows search input when showSearch is true', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} showSearch={true} />);
    expect(screen.getByPlaceholderText('Search badges...')).toBeTruthy();
  });

  it('hides search input when showSearch is false', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} showSearch={false} />);
    expect(screen.queryByPlaceholderText('Search badges...')).toBeNull();
  });

  it('shows category and rarity filters when showFilters is true', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} showFilters={true} />);
    expect(screen.getByText('Category:')).toBeTruthy();
    expect(screen.getByText('Rarity:')).toBeTruthy();
  });

  it('shows empty state when no badges match search', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} />);
    // Type in search box to filter to no results
    const searchInput = screen.getByPlaceholderText('Search badges...');
    fireEvent.change(searchInput, { target: { value: 'xyznotfound123' } });
    expect(screen.getByText('No badges found')).toBeTruthy();
  });

  it('shows badge modal when a badge card is clicked', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} />);
    const cards = screen.getAllByTestId('badge-card');
    fireEvent.click(cards[0]);
    expect(screen.getByTestId('badge-modal')).toBeTruthy();
  });

  it('closes badge modal when onClose is called', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} />);
    const cards = screen.getAllByTestId('badge-card');
    fireEvent.click(cards[0]);
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('badge-modal')).toBeNull();
  });

  it('shows earned only toggle', () => {
    render(<BadgeGallery badges={badges} userAchievements={[]} showFilters={true} />);
    expect(screen.getByText('Earned only')).toBeTruthy();
  });

  it('filters to earned badges when earned only is checked', () => {
    render(<BadgeGallery badges={badges} userAchievements={userAchievements} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    // Only 1 badge is earned
    expect(screen.getAllByTestId('badge-card')).toHaveLength(1);
  });

  it('shows in progress count', () => {
    const progress = [
      { badge_id: 'b2', current_progress: 3, target_progress: 10, user_id: 'user-1', space_id: 'space-1' },
    ];
    render(<BadgeGallery badges={badges} userAchievements={[]} progress={progress} />);
    // "In Progress" count should show 1
    expect(screen.getByText('In Progress')).toBeTruthy();
  });
});
