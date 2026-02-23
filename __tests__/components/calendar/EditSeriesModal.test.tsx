// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: {
    isRecurringOccurrence: vi.fn(() => false),
    deleteEvent: vi.fn().mockResolvedValue({}),
    recurring: {
      createException: vi.fn().mockResolvedValue({}),
      updateFromDate: vi.fn().mockResolvedValue({}),
      updateSeries: vi.fn().mockResolvedValue({}),
      deleteOccurrence: vi.fn().mockResolvedValue({}),
    },
  },
}));
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, children, title, footer }: {
    isOpen: boolean; children: React.ReactNode; title: string; footer?: React.ReactNode;
  }) => isOpen ? (
    <div>
      <h2>{title}</h2>
      {children}
      {footer}
    </div>
  ) : null,
}));

import { EditSeriesModal } from '@/components/calendar/EditSeriesModal';
import type { CalendarEvent } from '@/lib/services/calendar-service';

const mockEvent: CalendarEvent = {
  id: 'event-1',
  series_id: 'series-1',
  title: 'Weekly Standup',
  start_time: '2024-01-15T10:00:00Z',
  end_time: '2024-01-15T10:30:00Z',
  space_id: 'space-1',
  category: 'work',
  status: 'not-started',
  is_recurring: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EditSeriesModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    event: mockEvent,
    occurrenceDate: '2024-01-15',
    onEventUpdated: vi.fn(),
    onEventDeleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<EditSeriesModal {...defaultProps} />);
    expect(screen.getByText('Edit Recurring Event')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<EditSeriesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Edit Recurring Event')).toBeNull();
  });

  it('shows event title in description', () => {
    render(<EditSeriesModal {...defaultProps} />);
    expect(screen.getByText(/"Weekly Standup"/)).toBeTruthy();
  });

  it('shows edit scope options', () => {
    render(<EditSeriesModal {...defaultProps} />);
    expect(screen.getAllByText('Only this event').length).toBeGreaterThan(0);
    expect(screen.getAllByText('This and all future events').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All events in the series').length).toBeGreaterThan(0);
  });

  it('shows Continue button', () => {
    render(<EditSeriesModal {...defaultProps} />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<EditSeriesModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
