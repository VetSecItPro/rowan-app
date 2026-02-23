// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/calendar/important-dates-service', () => ({
  importantDatesService: {
    getUpcomingDates: vi.fn().mockResolvedValue({ dates: [], error: null }),
  },
}));
vi.mock('@/components/calendar/ImportantDateCard', () => ({
  ImportantDateCard: ({ date }: { date: { title: string } }) => (
    <div data-testid="date-card">{date.title}</div>
  ),
}));

import { ImportantDatesWidget } from '@/components/calendar/ImportantDatesWidget';
import { importantDatesService } from '@/lib/services/calendar/important-dates-service';

describe('ImportantDatesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<ImportantDatesWidget spaceId="space-1" />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no dates', async () => {
    render(<ImportantDatesWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No upcoming dates')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(importantDatesService.getUpcomingDates).mockResolvedValueOnce({
      dates: [],
      error: 'Failed to load dates',
    });
    render(<ImportantDatesWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load dates')).toBeTruthy();
    });
  });

  it('shows date cards when dates are loaded', async () => {
    vi.mocked(importantDatesService.getUpcomingDates).mockResolvedValueOnce({
      dates: [
        {
          id: 'date-1',
          title: 'Dad Birthday',
          person_name: 'Dad',
          date_type: 'birthday',
          emoji: '🎂',
          month: 5,
          day: 20,
          year: null,
          notes: null,
          days_until: 5,
          years: null,
          is_today: false,
          next_occurrence: '2024-05-20',
          space_id: 'space-1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ],
      error: null,
    });
    render(<ImportantDatesWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Dad Birthday')).toBeTruthy();
    });
  });

  it('shows Add button when onAddDate provided and empty', async () => {
    const onAddDate = vi.fn();
    render(<ImportantDatesWidget spaceId="space-1" onAddDate={onAddDate} />);
    await waitFor(() => {
      expect(screen.getByText('Add')).toBeTruthy();
    });
  });
});
