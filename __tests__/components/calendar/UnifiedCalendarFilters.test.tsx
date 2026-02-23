// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/types/unified-calendar-item', () => ({
  UNIFIED_ITEM_COLORS: {
    event: { bg: 'bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-300', dot: 'bg-purple-500' },
    task: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-300', dot: 'bg-blue-500' },
    meal: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-300', dot: 'bg-orange-500' },
    reminder: { bg: 'bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-300', dot: 'bg-pink-500' },
    goal: { bg: 'bg-indigo-900/30', border: 'border-indigo-500', text: 'text-indigo-300', dot: 'bg-indigo-500' },
  },
  UNIFIED_ITEM_ICONS: {
    event: '📅',
    task: '✅',
    meal: '🍽️',
    reminder: '🔔',
    goal: '🎯',
  },
  UNIFIED_ITEM_LABELS: {
    event: 'Event',
    task: 'Task',
    meal: 'Meal',
    reminder: 'Reminder',
    goal: 'Goal',
  },
}));

import { UnifiedCalendarFilters } from '@/components/calendar/UnifiedCalendarFilters';
import type { UnifiedCalendarFilters as FilterState } from '@/lib/types/unified-calendar-item';

const defaultFilters: FilterState = {
  showEvents: true,
  showTasks: true,
  showMeals: true,
  showReminders: true,
  showGoals: true,
};

describe('UnifiedCalendarFilters', () => {
  it('renders without crashing', () => {
    render(
      <UnifiedCalendarFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByText('Events')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Meals')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
  });

  it('shows Hide All when all enabled', () => {
    render(
      <UnifiedCalendarFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByText('Hide All')).toBeTruthy();
  });

  it('shows Show All when not all enabled', () => {
    render(
      <UnifiedCalendarFilters
        filters={{ ...defaultFilters, showEvents: false }}
        onFilterChange={vi.fn()}
      />
    );
    expect(screen.getByText('Show All')).toBeTruthy();
  });

  it('calls onFilterChange when a filter button is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <UnifiedCalendarFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
      />
    );
    fireEvent.click(screen.getByLabelText(/Hide event/i));
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ showEvents: false })
    );
  });

  it('shows counts when provided', () => {
    render(
      <UnifiedCalendarFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        counts={{ event: 3, task: 5, meal: 2, reminder: 1, goal: 0 }}
      />
    );
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows compact mode without label text', () => {
    render(
      <UnifiedCalendarFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        compact={true}
      />
    );
    // In compact mode, text labels are hidden but icons/buttons still exist
    expect(screen.queryByText('Events')).toBeNull();
  });
});
