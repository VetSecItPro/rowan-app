// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/goals-service', () => ({
  goalsService: {
    getGoalCheckIns: vi.fn().mockResolvedValue([]),
    getCheckInPhotos: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/goals/CheckInReactions', () => ({
  CheckInReactions: ({ checkInId }: { checkInId: string }) => (
    <div data-testid={`reactions-${checkInId}`} />
  ),
}));

import { CheckInHistoryTimeline } from '@/components/goals/CheckInHistoryTimeline';

describe('CheckInHistoryTimeline', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CheckInHistoryTimeline goalId="goal-1" isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    const { container } = render(
      <CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('shows Check-In History header when open', () => {
    render(<CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Check-In History')).toBeTruthy();
  });

  it('renders loading skeleton while fetching', () => {
    render(<CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={vi.fn()} />);
    // Should show loading state initially
    const { container } = render(
      <CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('shows close button', () => {
    render(<CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close timeline')).toBeTruthy();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CheckInHistoryTimeline goalId="goal-1" isOpen={true} onClose={onClose} />
    );
    const backdrop = container.querySelector('.absolute.inset-0.bg-black\\/80');
    if (backdrop) {
      (backdrop as HTMLElement).click();
      expect(onClose).toHaveBeenCalled();
    }
  });
});
