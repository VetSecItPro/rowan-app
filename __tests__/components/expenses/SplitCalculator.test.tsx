// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/services/expense-splitting-service', () => ({
  calculateIncomeBasedSplit: vi.fn((total, income1, income2) => {
    const totalIncome = income1 + income2;
    const pct1 = (income1 / totalIncome) * 100;
    const pct2 = (income2 / totalIncome) * 100;
    return {
      user1Amount: Math.round((total * (pct1 / 100)) * 100) / 100,
      user2Amount: Math.round((total * (pct2 / 100)) * 100) / 100,
      user1Percentage: pct1,
      user2Percentage: pct2,
    };
  }),
}));

import { SplitCalculator } from '@/components/expenses/SplitCalculator';

const defaultProps = {
  totalAmount: 100,
  splitType: 'equal' as const,
  user1Name: 'Alice',
  user2Name: 'Bob',
  onCalculate: vi.fn(),
};

describe('SplitCalculator', () => {
  it('renders without crashing', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Split Calculation')).toBeInTheDocument();
  });

  it('renders total amount display', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('renders user names', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows equal split amounts', () => {
    render(<SplitCalculator {...defaultProps} />);
    // Equal split: 50/50
    const fiftyAmounts = screen.getAllByText('$50');
    expect(fiftyAmounts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows percentage breakdown for equal split', () => {
    render(<SplitCalculator {...defaultProps} />);
    const pctTexts = screen.getAllByText('50.0% of total');
    expect(pctTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onCalculate on mount', () => {
    const onCalculate = vi.fn();
    render(<SplitCalculator {...defaultProps} onCalculate={onCalculate} />);
    expect(onCalculate).toHaveBeenCalled();
  });

  it('renders percentage input labels when splitType is percentage', () => {
    render(<SplitCalculator {...defaultProps} splitType="percentage" />);
    // Labels exist as visible text even without htmlFor association
    expect(screen.getByText('Alice %')).toBeInTheDocument();
    expect(screen.getByText('Bob %')).toBeInTheDocument();
  });

  it('renders percentage inputs when splitType is percentage', () => {
    render(<SplitCalculator {...defaultProps} splitType="percentage" />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders fixed amount label text when splitType is fixed', () => {
    render(<SplitCalculator {...defaultProps} splitType="fixed" />);
    expect(screen.getByText('Alice $')).toBeInTheDocument();
    expect(screen.getByText('Bob $')).toBeInTheDocument();
  });

  it('renders fixed amount inputs when splitType is fixed', () => {
    render(<SplitCalculator {...defaultProps} splitType="fixed" />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows income-based info section when splitType is income-based', () => {
    render(<SplitCalculator {...defaultProps} splitType="income-based" />);
    expect(screen.getByText(/Income-based split/)).toBeInTheDocument();
  });

  it('shows income values when income-based and incomes provided', () => {
    render(
      <SplitCalculator
        {...defaultProps}
        splitType="income-based"
        user1Income={3000}
        user2Income={2000}
      />
    );
    expect(screen.getByText(/\$3,000\/month/)).toBeInTheDocument();
    expect(screen.getByText(/\$2,000\/month/)).toBeInTheDocument();
  });

  it('shows income error when income-based but no incomes', () => {
    render(<SplitCalculator {...defaultProps} splitType="income-based" />);
    expect(
      screen.getByText('Income information not set. Update incomes to use this split type.')
    ).toBeInTheDocument();
  });

  it('renders visual split bar', () => {
    const { container } = render(<SplitCalculator {...defaultProps} />);
    const splitBar = container.querySelector('.bg-emerald-500');
    expect(splitBar).toBeInTheDocument();
  });
});
