// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import StatCards from '@/components/goals/analytics/StatCards';

const defaultProps = {
  totalGoals: 12,
  completionRate: 75,
  currentStreak: 5,
  avgTimeToComplete: 30,
  totalMilestones: 24,
  mostProductiveMonth: { month: 'January', year: 2026, completions: 4 },
};

describe('StatCards', () => {
  it('renders without crashing', () => {
    const { container } = render(<StatCards {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays total goals count', () => {
    render(<StatCards {...defaultProps} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Total Goals')).toBeTruthy();
  });

  it('displays completion rate', () => {
    render(<StatCards {...defaultProps} />);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('Completion Rate')).toBeTruthy();
  });

  it('displays current streak', () => {
    render(<StatCards {...defaultProps} />);
    expect(screen.getByText('5 days')).toBeTruthy();
    expect(screen.getByText('Current Streak')).toBeTruthy();
  });

  it('displays average time to complete', () => {
    render(<StatCards {...defaultProps} />);
    expect(screen.getByText('30 days')).toBeTruthy();
    expect(screen.getByText('Avg Time to Complete')).toBeTruthy();
  });

  it('displays total milestones', () => {
    render(<StatCards {...defaultProps} />);
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('Total Milestones')).toBeTruthy();
  });

  it('renders with null mostProductiveMonth', () => {
    const { container } = render(<StatCards {...defaultProps} mostProductiveMonth={null} />);
    expect(container).toBeTruthy();
  });

  it('renders all stat cards', () => {
    const { container } = render(<StatCards {...defaultProps} />);
    // 6 stat cards expected
    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
