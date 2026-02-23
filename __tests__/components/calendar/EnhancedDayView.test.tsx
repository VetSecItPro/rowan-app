// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/components/calendar/WeatherBadge', () => ({
  WeatherBadge: () => React.createElement('div', { 'data-testid': 'weather-badge' }, 'Weather'),
}));

import { EnhancedDayView } from '@/components/calendar/EnhancedDayView';
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
  title: 'Morning Meeting',
  start_time: '2024-01-15T09:00:00',
  end_time: '2024-01-15T10:00:00',
  space_id: 'space-1',
  category: 'work',
  status: 'not-started',
  is_recurring: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EnhancedDayView', () => {
  const defaultProps = {
    date: new Date('2024-01-15T00:00:00'),
    events: [],
    onEventStatusClick: vi.fn(),
    onViewDetails: vi.fn(),
    onEditEvent: vi.fn(),
    getCategoryColor,
  };

  it('renders without crashing', () => {
    render(<EnhancedDayView {...defaultProps} />);
    expect(document.querySelector('.bg-gray-900')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    render(<EnhancedDayView {...defaultProps} />);
    expect(screen.getByText('No events scheduled')).toBeTruthy();
  });

  it('renders time labels', () => {
    render(<EnhancedDayView {...defaultProps} />);
    // format(_, 'h a') produces e.g. "6 AM" - check body has AM/PM labels
    expect(document.body.textContent).toMatch(/AM|PM/);
  });

  it('renders event when provided', () => {
    render(<EnhancedDayView {...defaultProps} events={[mockEvent]} />);
    // The title appears in the event block
    expect(document.body.textContent).toContain('Morning Meeting');
  });

  it('shows weather badge when event has location', () => {
    const eventWithLocation = { ...mockEvent, location: 'Office' };
    render(<EnhancedDayView {...defaultProps} events={[eventWithLocation]} />);
    expect(screen.getByTestId('weather-badge')).toBeTruthy();
  });
});
