// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

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

import { vi } from 'vitest';
import { UnifiedCalendarLegend, UnifiedCalendarLegendCompact } from '@/components/calendar/UnifiedCalendarLegend';

describe('UnifiedCalendarLegend', () => {
  it('renders without crashing', () => {
    render(<UnifiedCalendarLegend />);
    expect(screen.getByText('Events')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Meals')).toBeTruthy();
    expect(screen.getByText('Reminders')).toBeTruthy();
  });

  it('shows icons when showIcons is true', () => {
    render(<UnifiedCalendarLegend showIcons={true} />);
    expect(screen.getByText('📅')).toBeTruthy();
  });

  it('renders in vertical orientation', () => {
    const { container } = render(<UnifiedCalendarLegend orientation="vertical" />);
    expect(container.querySelector('.flex-col')).toBeTruthy();
  });

  it('renders in horizontal orientation', () => {
    const { container } = render(<UnifiedCalendarLegend orientation="horizontal" />);
    expect(container.querySelector('.flex-row')).toBeTruthy();
  });
});

describe('UnifiedCalendarLegendCompact', () => {
  it('renders without crashing', () => {
    const { container } = render(<UnifiedCalendarLegendCompact />);
    // Should render stacked dots
    const dots = container.querySelectorAll('.rounded-full');
    expect(dots.length).toBeGreaterThan(0);
  });
});
