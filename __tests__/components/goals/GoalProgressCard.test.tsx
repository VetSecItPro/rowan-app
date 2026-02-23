// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/goal-contributions-service', () => ({
  getGoalContributions: vi.fn().mockResolvedValue([]),
  calculateProjectedCompletionDate: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import GoalProgressCard from '@/components/goals/GoalProgressCard';
import type { FinancialGoal } from '@/lib/services/goal-contributions-service';

const mockFinancialGoal: FinancialGoal = {
  id: 'goal-1',
  space_id: 'space-1',
  title: 'Emergency Fund',
  description: 'Build 6 months of expenses',
  status: 'active',
  progress: 40,
  is_financial: true,
  target_amount: 10000,
  current_amount: 4000,
  target_date: '2026-12-31',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('GoalProgressCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(container).toBeTruthy();
  });

  it('displays goal title', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('Emergency Fund')).toBeTruthy();
  });

  it('displays goal description', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('Build 6 months of expenses')).toBeTruthy();
  });

  it('displays current amount', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('$4,000')).toBeTruthy();
  });

  it('displays target amount', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText(/\$10,000/)).toBeTruthy();
  });

  it('returns null for non-financial goal', () => {
    const nonFinancialGoal = { ...mockFinancialGoal, is_financial: false };
    const { container } = render(<GoalProgressCard goal={nonFinancialGoal} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when target_amount is missing', () => {
    const goalNoAmount = { ...mockFinancialGoal, target_amount: undefined };
    const { container } = render(<GoalProgressCard goal={goalNoAmount} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows remaining amount', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('$6,000 remaining')).toBeTruthy();
  });

  it('shows milestone markers', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('shows Complete badge when fully funded', () => {
    const completedGoal = { ...mockFinancialGoal, current_amount: 10000 };
    render(<GoalProgressCard goal={completedGoal} />);
    expect(screen.getByText('Complete!')).toBeTruthy();
  });

  it('shows target date when provided', () => {
    render(<GoalProgressCard goal={mockFinancialGoal} />);
    expect(screen.getByText('Target Date')).toBeTruthy();
  });

  it('calls onClick when card clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<GoalProgressCard goal={mockFinancialGoal} onClick={onClick} />);
    const card = container.firstChild as HTMLElement;
    card.click();
    expect(onClick).toHaveBeenCalled();
  });
});
