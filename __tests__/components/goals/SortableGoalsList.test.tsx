// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dnd-context' }, children),
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    result.splice(to, 0, result.splice(from, 1)[0]);
    return result;
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'sortable-context' }, children),
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
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
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

vi.mock('@/lib/utils/haptics', () => ({
  hapticLight: vi.fn(),
  hapticMedium: vi.fn(),
}));

vi.mock('@/components/goals/PresenceIndicator', () => ({
  PresenceIndicator: () => React.createElement('div', { 'data-testid': 'presence-indicator' }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) =>
    React.createElement('img', { src, alt, width, height }),
}));

vi.mock('@/lib/utils/date-utils', () => ({
  formatDate: vi.fn((d: string) => d),
  formatTimestamp: vi.fn((ts: string) => ts),
  getCurrentDateString: vi.fn(() => '2026-02-22'),
}));

import { SortableGoalsList } from '@/components/goals/SortableGoalsList';
import type { Goal } from '@/lib/services/goals-service';

const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    space_id: 'space-1',
    title: 'First Goal',
    status: 'active',
    progress: 25,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    space_id: 'space-1',
    title: 'Second Goal',
    status: 'active',
    progress: 75,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const defaultProps = {
  goals: mockGoals,
  onReorder: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('SortableGoalsList', () => {
  it('renders without crashing', () => {
    const { container } = render(<SortableGoalsList {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders DndContext', () => {
    render(<SortableGoalsList {...defaultProps} />);
    expect(screen.getByTestId('dnd-context')).toBeTruthy();
  });

  it('renders SortableContext', () => {
    render(<SortableGoalsList {...defaultProps} />);
    expect(screen.getByTestId('sortable-context')).toBeTruthy();
  });

  it('renders all goal cards', () => {
    render(<SortableGoalsList {...defaultProps} />);
    expect(screen.getByText('First Goal')).toBeTruthy();
    expect(screen.getByText('Second Goal')).toBeTruthy();
  });

  it('renders with empty goals array', () => {
    const { container } = render(<SortableGoalsList {...defaultProps} goals={[]} />);
    expect(container).toBeTruthy();
  });

  it('passes optional callbacks to goal cards', () => {
    const onCheckIn = vi.fn();
    const onShowHistory = vi.fn();
    render(
      <SortableGoalsList
        {...defaultProps}
        onCheckIn={onCheckIn}
        onShowHistory={onShowHistory}
      />
    );
    expect(screen.getByText('First Goal')).toBeTruthy();
  });

  it('accepts getUsersViewingGoal prop', () => {
    const getUsersViewingGoal = vi.fn(() => []);
    render(
      <SortableGoalsList
        {...defaultProps}
        getUsersViewingGoal={getUsersViewingGoal}
      />
    );
    expect(screen.getByText('First Goal')).toBeTruthy();
  });
});
