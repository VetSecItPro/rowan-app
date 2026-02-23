// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/calendar/WeatherBadge', () => ({
  WeatherBadge: () => React.createElement('div', { 'data-testid': 'weather-badge' }, 'Weather'),
}));

import { EnhancedWeekView } from '@/components/calendar/EnhancedWeekView';
import type { CalendarEvent } from '@/lib/services/calendar-service';

const getCategoryColor = () => ({
  border: 'border-purple-500',
  bg: 'bg-purple-900/30',
  text: 'text-purple-300',
  color: 'bg-purple-800',
});

// Use local time (no Z suffix) to avoid timezone issues in isSameDay comparison
const mockEvent: CalendarEvent = {
  id: 'ev-1',
  title: 'Weekly Sync',
  start_time: '2024-01-15T09:00:00',
  end_time: '2024-01-15T10:00:00',
  space_id: 'space-1',
  category: 'work',
  status: 'not-started',
  is_recurring: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EnhancedWeekView', () => {
  const defaultProps = {
    date: new Date('2024-01-15T00:00:00'),
    events: [],
    onEventStatusClick: vi.fn(),
    onViewDetails: vi.fn(),
    onEditEvent: vi.fn(),
    getCategoryColor,
  };

  it('renders without crashing', () => {
    render(<EnhancedWeekView {...defaultProps} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('shows 7 day columns', () => {
    render(<EnhancedWeekView {...defaultProps} />);
    // Each day should have a header (Mon-Sun)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      const elements = screen.queryAllByText(new RegExp(day, 'i'));
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders event when provided', () => {
    render(<EnhancedWeekView {...defaultProps} events={[mockEvent]} />);
    // Event title should appear somewhere in the rendered output
    expect(document.body.textContent).toContain('Weekly Sync');
  });

  it('renders time labels in body', () => {
    render(<EnhancedWeekView {...defaultProps} />);
    // Time labels use format 'ha'.toLowerCase() producing "6am", "7am", etc.
    expect(document.body.textContent).toMatch(/\d+am|\d+pm/);
  });
});
