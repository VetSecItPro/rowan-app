// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Must mock canvas-confetti before importing the component
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

import MilestoneCelebration from '@/components/goals/MilestoneCelebration';

const defaultProps = {
  goalTitle: 'Save $10,000',
  milestoneTitle: 'Halfway There!',
  milestoneDescription: 'You have reached 50% of your goal',
  percentageReached: 50,
  onClose: vi.fn(),
  autoCloseDelay: 100000, // large value to prevent auto-close in tests
};

describe('MilestoneCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders after entrance animation fires', async () => {
    const { container } = render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(container).toBeTruthy();
  });

  it('shows milestone title after mount', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('Halfway There!')).toBeTruthy();
  });

  it('shows goal title after mount', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('Save $10,000')).toBeTruthy();
  });

  it('shows percentage after mount', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('shows description after mount', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('You have reached 50% of your goal')).toBeTruthy();
  });

  it('shows motivational message for 50% milestone', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText(/Halfway there/)).toBeTruthy();
  });

  it('shows motivational message for 100% completion', async () => {
    render(<MilestoneCelebration {...defaultProps} percentageReached={100} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText(/Amazing/)).toBeTruthy();
  });

  it('shows Continue button after mount', async () => {
    render(<MilestoneCelebration {...defaultProps} />);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByText('Continue')).toBeTruthy();
  });
});
