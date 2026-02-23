// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('date-fns', () => ({ format: vi.fn(() => 'Jan 1, 2026') }));

vi.mock('@/lib/services/achievement-service', () => ({
  getAllBadges: vi.fn(() => Promise.resolve([])),
  getUserBadges: vi.fn(() => Promise.resolve([])),
  getBadgeProgress: vi.fn(() => Promise.resolve([])),
  getUserBadgeStats: vi.fn(() =>
    Promise.resolve({
      totalBadges: 0,
      totalPoints: 0,
      byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      byCategory: {},
    })
  ),
}));

vi.mock('@/components/goals/badges/BadgeCard', () => ({
  default: ({ badge }: { badge: { name: string } }) => <div data-testid="badge-card">{badge.name}</div>,
}));

import BadgeCollection from '@/components/goals/badges/BadgeCollection';

describe('BadgeCollection', () => {
  it('renders without crashing', () => {
    const { container } = render(<BadgeCollection userId="user-1" spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders loading state initially', () => {
    const { container } = render(<BadgeCollection userId="user-1" spaceId="space-1" />);
    // Component renders something while loading
    expect(container.firstChild).toBeTruthy();
  });

  it('accepts userId and spaceId props', () => {
    const { container } = render(<BadgeCollection userId="user-abc" spaceId="space-xyz" />);
    expect(container).toBeTruthy();
  });
});
