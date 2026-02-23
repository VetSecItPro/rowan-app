// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/calendar/countdown-service', () => ({
  countdownService: {
    getActiveCountdowns: vi.fn().mockResolvedValue({ countdowns: [], error: null }),
  },
}));
vi.mock('@/components/calendar/CountdownCard', () => ({
  CountdownCard: ({ countdown }: { countdown: { label: string } }) => (
    <div data-testid="countdown-card">{countdown.label}</div>
  ),
}));

import { CountdownWidget } from '@/components/calendar/CountdownWidget';
import { countdownService } from '@/lib/services/calendar/countdown-service';

describe('CountdownWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    render(<CountdownWidget spaceId="space-1" />);
    // Skeletons have animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no countdowns', async () => {
    render(<CountdownWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No upcoming countdowns')).toBeTruthy();
    });
  });

  it('renders countdown cards when data is loaded', async () => {
    vi.mocked(countdownService.getActiveCountdowns).mockResolvedValueOnce({
      countdowns: [
        {
          id: 'c-1',
          label: 'Birthday Party',
          daysRemaining: 3,
          isToday: false,
          targetDate: new Date('2024-02-05'),
          source: 'event',
          event: { id: 'ev-1' } as never,
        },
      ],
      error: null,
    });
    render(<CountdownWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Birthday Party')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    vi.mocked(countdownService.getActiveCountdowns).mockResolvedValueOnce({
      countdowns: [],
      error: 'Failed to load',
    });
    render(<CountdownWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeTruthy();
    });
  });

  it('shows header when showHeader is true', async () => {
    render(<CountdownWidget spaceId="space-1" showHeader={true} />);
    await waitFor(() => {
      expect(screen.queryByText('No upcoming countdowns')).toBeTruthy();
    });
  });

  it('shows Add button when onAddCountdown is provided and empty', async () => {
    const onAddCountdown = vi.fn();
    render(<CountdownWidget spaceId="space-1" onAddCountdown={onAddCountdown} />);
    await waitFor(() => {
      expect(screen.getByText('Add')).toBeTruthy();
    });
  });
});
