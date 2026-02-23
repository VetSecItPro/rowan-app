// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/services/achievement-badges-service', () => ({}));
vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }));
vi.mock('@/lib/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) =>
      ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(tag, props, children),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    isOpen,
    onClose,
    title,
    children,
    footer,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
        <button onClick={onClose}>X</button>
      </div>
    ) : null,
}));

import { BadgeModal } from '@/components/achievements/BadgeModal';
import type { AchievementBadge, UserAchievement, AchievementProgress } from '@/lib/services/achievement-badges-service';

// Use a badge where description and criteria text are different
const mockBadge: AchievementBadge = {
  id: 'badge-1',
  name: 'Champion',
  // Description is distinct from criteria output
  description: 'Achieve greatness in your household goals',
  rarity: 'rare',
  points: 250,
  category: 'goals',
  // Criteria renders as "Complete 10 goals"
  criteria: { type: 'goals_completed', count: 10 },
  color: 'blue',
  is_secret: false,
  created_at: '2024-01-01T00:00:00Z',
};

const mockAchievement: UserAchievement = {
  id: 'ua-1',
  badge_id: 'badge-1',
  user_id: 'user-1',
  space_id: 'space-1',
  earned_at: '2024-07-04T12:00:00Z',
  progress_data: {},
};

const mockProgress: AchievementProgress = {
  badge_id: 'badge-1',
  current_progress: 5,
  target_progress: 10,
  user_id: 'user-1',
  space_id: 'space-1',
};

describe('BadgeModal', () => {
  it('renders without crashing when open', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('does not render when closed', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId('modal')).toBeNull();
  });

  it('displays badge name as modal title', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Champion')).toBeTruthy();
  });

  it('displays badge description', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Achieve greatness in your household goals')).toBeTruthy();
  });

  it('shows earned status when userAchievement is provided', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        userAchievement={mockAchievement}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Badge Earned!')).toBeTruthy();
  });

  it('shows requirements for non-locked badges', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Requirements')).toBeTruthy();
    // Criteria for goals_completed with count 10 renders "Complete 10 goals"
    expect(screen.getByText('Complete 10 goals')).toBeTruthy();
  });

  it('shows progress when provided and badge not earned', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        progress={mockProgress}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Progress')).toBeTruthy();
    expect(screen.getByText('5 / 10')).toBeTruthy();
  });

  it('displays badge points', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByText('Points')).toBeTruthy();
  });

  it('displays badge rarity', () => {
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('rare')).toBeTruthy();
    expect(screen.getByText('Rarity')).toBeTruthy();
  });

  it('shows ??? as title for locked secret badge', () => {
    const secretBadge = { ...mockBadge, is_secret: true };
    render(
      <BadgeModal
        badge={secretBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('???')).toBeTruthy();
  });

  it('hides requirements for locked secret badge', () => {
    const secretBadge = { ...mockBadge, is_secret: true };
    render(
      <BadgeModal
        badge={secretBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Requirements')).toBeNull();
  });

  it('calls onClose when close button in footer is clicked', () => {
    const onClose = vi.fn();
    render(
      <BadgeModal
        badge={mockBadge}
        isOpen={true}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('formats milestone criteria correctly', () => {
    const milestoneBadge = {
      ...mockBadge,
      criteria: { type: 'milestones_completed', count: 5 },
    };
    render(
      <BadgeModal
        badge={milestoneBadge}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Complete 5 milestones')).toBeTruthy();
  });
});
