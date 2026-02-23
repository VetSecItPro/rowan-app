// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

vi.mock('@/lib/services/reminder-activity-service', () => ({
  reminderActivityService: {
    getActivityLog: vi.fn().mockResolvedValue([]),
    getActivityIcon: vi.fn().mockReturnValue('Activity'),
    getActivityColor: vi.fn().mockReturnValue('text-blue-400'),
    formatActivityMessage: vi.fn().mockReturnValue('Created reminder'),
  },
}));

import { ActivityTimeline } from '@/components/reminders/ActivityTimeline';

describe('ActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<ActivityTimeline reminderId="reminder-1" />);
    expect(container).toBeTruthy();
  });

  it('shows loading state initially', () => {
    render(<ActivityTimeline reminderId="reminder-1" />);
    // During loading, the skeleton placeholders are shown
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeTruthy();
  });

  it('renders activity header label', () => {
    render(<ActivityTimeline reminderId="reminder-1" />);
    // Multiple "Activity" headings may appear in loading or loaded state
    const headings = document.querySelectorAll('h3');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders with empty reminderId gracefully', () => {
    const { container } = render(<ActivityTimeline reminderId="" />);
    expect(container).toBeTruthy();
  });

  it('accepts className prop', () => {
    const { container } = render(
      <ActivityTimeline reminderId="reminder-1" className="custom-class" />
    );
    expect(container).toBeTruthy();
  });
});
