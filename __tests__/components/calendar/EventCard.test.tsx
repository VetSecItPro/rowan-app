// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn((ts: string, fmt: string) => {
    if (fmt === 'h:mm a') return '10:00 AM';
    return 'Jan 15, 2024';
  }),
}));

import { EventCard } from '@/components/calendar/EventCard';
import type { CalendarEvent } from '@/lib/services/calendar-service';

const mockEvent: CalendarEvent = {
  id: 'ev-1',
  title: 'Team Meeting',
  start_time: '2024-01-15T10:00:00Z',
  end_time: '2024-01-15T11:00:00Z',
  space_id: 'space-1',
  category: 'work',
  status: 'not-started',
  is_recurring: false,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EventCard', () => {
  const defaultProps = {
    event: mockEvent,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<EventCard {...defaultProps} />);
    expect(screen.getByText('Team Meeting')).toBeTruthy();
  });

  it('displays event category badge', () => {
    render(<EventCard {...defaultProps} />);
    expect(screen.getAllByText(/Work/).length).toBeGreaterThan(0);
  });

  it('displays formatted date and time', () => {
    render(<EventCard {...defaultProps} />);
    expect(screen.getByText('Jan 15, 2024')).toBeTruthy();
    expect(screen.getByText('10:00 AM')).toBeTruthy();
  });

  it('shows description when present', () => {
    const eventWithDesc = { ...mockEvent, description: 'Discuss Q1 goals' };
    render(<EventCard {...defaultProps} event={eventWithDesc} />);
    expect(screen.getByText('Discuss Q1 goals')).toBeTruthy();
  });

  it('shows location when present', () => {
    const eventWithLoc = { ...mockEvent, location: 'Conference Room A' };
    render(<EventCard {...defaultProps} event={eventWithLoc} />);
    expect(screen.getByText('Conference Room A')).toBeTruthy();
  });

  it('opens menu on three-dot button click', () => {
    render(<EventCard {...defaultProps} />);
    const menuButton = screen.getByLabelText('Event options menu');
    fireEvent.click(menuButton);
    expect(screen.getByText('Edit Event')).toBeTruthy();
    expect(screen.getByText('Delete Event')).toBeTruthy();
  });

  it('calls onEdit when Edit Event clicked', () => {
    const onEdit = vi.fn();
    render(<EventCard {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Event options menu'));
    fireEvent.click(screen.getByText('Edit Event'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onDelete when Delete Event clicked', () => {
    const onDelete = vi.fn();
    render(<EventCard {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Event options menu'));
    fireEvent.click(screen.getByText('Delete Event'));
    expect(onDelete).toHaveBeenCalledWith('ev-1');
  });

  it('shows View Details option when onViewDetails provided', () => {
    render(<EventCard {...defaultProps} onViewDetails={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Event options menu'));
    expect(screen.getByText('View Details')).toBeTruthy();
  });

  it('cycles status when checkbox is clicked', () => {
    const onStatusChange = vi.fn();
    render(<EventCard {...defaultProps} onStatusChange={onStatusChange} />);
    const statusBtn = screen.getByLabelText(/Toggle event status/);
    fireEvent.click(statusBtn);
    expect(onStatusChange).toHaveBeenCalledWith('ev-1', 'in-progress');
  });
});
