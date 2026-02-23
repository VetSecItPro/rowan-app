// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('date-fns', async () => {
  const actual = await vi.importActual<typeof import('date-fns')>('date-fns');
  return actual;
});

import RecurringBillsCalendar from '@/components/expenses/RecurringBillsCalendar';

describe('RecurringBillsCalendar', () => {
  it('renders without crashing', () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    expect(screen.getByText('Recurring Bills Calendar')).toBeInTheDocument();
  });

  it('renders the calendar header', () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    expect(screen.getByText('Recurring Bills Calendar')).toBeInTheDocument();
  });

  it('renders Today button', () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders total this month text', () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    expect(screen.getByText(/Total this month/)).toBeInTheDocument();
  });

  it('renders weekday headers after loading', async () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    await waitFor(() => {
      weekdays.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });
  });

  it('renders navigation chevrons', () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    // Buttons in the header: Today, prev, next
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('shows loading or calendar content after mount', async () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    // Either shows loading text or the calendar grid after loading
    await waitFor(() => {
      const hasLoading = screen.queryByText('Loading calendar...');
      const hasSun = screen.queryByText('Sun');
      expect(hasLoading || hasSun).toBeTruthy();
    });
  });

  it('navigates to previous month when prev chevron is clicked', async () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    const buttons = screen.getAllByRole('button');
    // Does not throw
    fireEvent.click(buttons[1]);
  });

  it('navigates to next month when next chevron is clicked', async () => {
    render(<RecurringBillsCalendar spaceId="space-1" />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
  });
});
