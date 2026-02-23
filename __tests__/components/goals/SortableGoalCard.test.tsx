// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((date: string) => date),
  formatTimestamp: vi.fn((ts: string) => ts),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

vi.mock('@/components/shared/PresenceIndicator', () => ({
  PresenceIndicator: () => <div data-testid="presence-indicator" />,
}));

import { SortableGoalCard } from '@/components/goals/SortableGoalCard';
import type { Goal } from '@/lib/services/goals-service';

const mockGoal: Goal = {
  id: 'goal-1',
  space_id: 'space-1',
  title: 'Sortable Test Goal',
  status: 'active',
  progress: 30,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  goal: mockGoal,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('SortableGoalCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SortableGoalCard {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays goal title', () => {
    render(<SortableGoalCard {...defaultProps} />);
    expect(screen.getByText('Sortable Test Goal')).toBeTruthy();
  });

  it('renders drag handle', () => {
    const { container } = render(<SortableGoalCard {...defaultProps} />);
    // Drag handle should be present
    expect(container.querySelector('.cursor-grab')).toBeTruthy();
  });

  it('renders GoalCard inside', () => {
    render(<SortableGoalCard {...defaultProps} />);
    expect(screen.getByLabelText('Goal options menu')).toBeTruthy();
  });

  it('shows pinned indicator when goal is pinned', () => {
    const pinnedGoal = { ...mockGoal, is_pinned: true };
    const { container } = render(<SortableGoalCard {...defaultProps} goal={pinnedGoal} />);
    // Pinned indicator bar at top
    expect(container.querySelector('.bg-gradient-to-r.from-yellow-400')).toBeTruthy();
  });

  it('renders PresenceIndicator when viewingUsers provided', () => {
    const viewingUsers = [{ id: 'user-2', name: 'Jane', color: '#ff0000', lastSeen: '' }];
    render(<SortableGoalCard {...defaultProps} viewingUsers={viewingUsers} />);
    expect(screen.getByTestId('presence-indicator')).toBeTruthy();
  });

  it('does not render PresenceIndicator when no viewingUsers', () => {
    render(<SortableGoalCard {...defaultProps} viewingUsers={[]} />);
    expect(screen.queryByTestId('presence-indicator')).toBeNull();
  });
});
