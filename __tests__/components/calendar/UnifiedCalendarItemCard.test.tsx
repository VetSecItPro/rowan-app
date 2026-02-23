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

import { UnifiedCalendarItemCard } from '@/components/calendar/UnifiedCalendarItemCard';
import type { UnifiedCalendarItem } from '@/lib/types/unified-calendar-item';

const makeItem = (overrides: Partial<UnifiedCalendarItem> = {}): UnifiedCalendarItem => ({
  id: 'item-1',
  itemType: 'event',
  title: 'Morning Standup',
  startTime: '2024-01-15T09:00:00Z',
  status: 'not-started',
  originalItem: {} as never,
  ...overrides,
});

describe('UnifiedCalendarItemCard', () => {
  it('renders without crashing', () => {
    render(<UnifiedCalendarItemCard item={makeItem()} />);
    expect(screen.getByText('Morning Standup')).toBeTruthy();
  });

  it('shows time formatted', () => {
    render(<UnifiedCalendarItemCard item={makeItem({ startTime: '2024-01-15T09:00:00Z' })} />);
    expect(document.body.textContent).toContain('AM');
  });

  it('shows time range when endTime provided', () => {
    render(
      <UnifiedCalendarItemCard
        item={makeItem({
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T10:00:00Z',
        })}
      />
    );
    // Should show time range with dash
    expect(document.body.textContent).toContain('-');
  });

  it('applies line-through for completed tasks', () => {
    const { container } = render(
      <UnifiedCalendarItemCard
        item={makeItem({ itemType: 'task', status: 'completed' })}
      />
    );
    expect(container.querySelector('.line-through')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<UnifiedCalendarItemCard item={makeItem()} onClick={onClick} />);
    fireEvent.click(screen.getByText('Morning Standup').closest('div')!.parentElement!);
    expect(onClick).toHaveBeenCalled();
  });

  it('renders compact mode', () => {
    render(<UnifiedCalendarItemCard item={makeItem()} compact={true} />);
    expect(screen.getByText('Morning Standup')).toBeTruthy();
  });
});
