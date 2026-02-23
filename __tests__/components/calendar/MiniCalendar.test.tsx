// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import type { Event } from '@/lib/types';

const mockEvents: Event[] = [
  {
    id: 'ev-1',
    title: 'Test Event',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T11:00:00Z',
    space_id: 'space-1',
    category: 'personal',
    status: 'not-started',
    is_recurring: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
];

describe('MiniCalendar', () => {
  const defaultProps = {
    currentDate: new Date('2024-01-15'),
    onDateSelect: vi.fn(),
    events: [],
  };

  it('renders without crashing', () => {
    render(<MiniCalendar {...defaultProps} />);
    expect(screen.getByText('January 2024')).toBeTruthy();
  });

  it('shows month and year header', () => {
    render(<MiniCalendar {...defaultProps} />);
    expect(screen.getByText('January 2024')).toBeTruthy();
  });

  it('shows weekday headers', () => {
    render(<MiniCalendar {...defaultProps} />);
    // M T W T F S S
    const headers = document.querySelectorAll('.text-xs.font-medium.text-gray-400.text-center');
    expect(headers.length).toBe(7);
  });

  it('shows Jump to Today button', () => {
    render(<MiniCalendar {...defaultProps} />);
    expect(screen.getByText('Jump to Today')).toBeTruthy();
  });

  it('navigates to previous month', () => {
    render(<MiniCalendar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText('December 2023')).toBeTruthy();
  });

  it('navigates to next month', () => {
    render(<MiniCalendar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('February 2024')).toBeTruthy();
  });

  it('calls onDateSelect when day is clicked', () => {
    const onDateSelect = vi.fn();
    render(<MiniCalendar {...defaultProps} onDateSelect={onDateSelect} />);
    // Find day 15 (selected day)
    const day15 = screen.getAllByText('15').find(el => el.tagName === 'SPAN');
    if (day15) {
      fireEvent.click(day15.closest('button')!);
    }
    // Date might be selected already or re-clicked
    expect(onDateSelect).toHaveBeenCalled();
  });

  it('shows event indicators for days with events', () => {
    render(<MiniCalendar {...defaultProps} events={mockEvents} />);
    const dots = document.querySelectorAll('.rounded-full.bg-purple-500');
    expect(dots.length).toBeGreaterThan(0);
  });
});
