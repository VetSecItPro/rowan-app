// @vitest-environment jsdom
/**
 * Tests for BudgetProgressBar (PR14). The over-budget math drives the family-
 * facing "how much over are we" signal, so the percentage + overage rendering
 * is worth pinning.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetProgressBar } from '@/components/budget/BudgetProgressBar';

describe('BudgetProgressBar', () => {
  it('shows the used percentage when under budget, with no overage legend', () => {
    render(<BudgetProgressBar monthlyBudget={1000} spentThisMonth={500} />);
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.queryByText(/over/i)).toBeNull();
  });

  it('renders the overage callout + legend when over budget', () => {
    render(<BudgetProgressBar monthlyBudget={1000} spentThisMonth={1200} />);
    // 120% used, 20% over. The percentage + overage share one text node.
    expect(screen.getByText(/120\.0%\s*\(\+20\.0% over\)/)).toBeInTheDocument();
    expect(screen.getByText(/Budget \(100%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Over \(\+20\.0%\)/)).toBeInTheDocument();
  });

  it('treats exactly-at-budget as 100% and not over', () => {
    render(<BudgetProgressBar monthlyBudget={1000} spentThisMonth={1000} />);
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.queryByText(/over/i)).toBeNull();
  });

  it('handles a zero budget without dividing by zero (0%)', () => {
    render(<BudgetProgressBar monthlyBudget={0} spentThisMonth={0} />);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.queryByText(/over/i)).toBeNull();
  });
});
