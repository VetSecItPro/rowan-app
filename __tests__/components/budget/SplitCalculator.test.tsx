// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitCalculator } from '@/components/budget/SplitCalculator';

vi.mock('@/lib/services/expense-splitting-service', () => ({
  suggestSplitType: vi.fn().mockReturnValue('equal'),
}));

const defaultProps = {
  splitType: 'equal' as const,
  totalAmount: 100,
  user1Amount: 50,
  user2Amount: 50,
  user1Percentage: 50,
  user2Percentage: 50,
  onPercentageChange: vi.fn(),
  onAmountChange: vi.fn(),
  partnership: null,
};

describe('SplitCalculator', () => {
  it('renders without crashing', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Split Calculation')).toBeInTheDocument();
  });

  it('shows Partner 1 and Partner 2 sections', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Partner 1')).toBeInTheDocument();
    expect(screen.getByText('Partner 2')).toBeInTheDocument();
  });

  it('shows equal amounts for equal split', () => {
    render(<SplitCalculator {...defaultProps} />);
    const fiftyTexts = screen.getAllByText(/\$50\.00/);
    expect(fiftyTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows total split validation row', () => {
    render(<SplitCalculator {...defaultProps} />);
    expect(screen.getByText('Total Split:')).toBeInTheDocument();
  });

  it('shows split amounts match total when valid', () => {
    render(<SplitCalculator {...defaultProps} />);
    // Both amounts 50+50 = 100 = totalAmount so valid - no error shown
    expect(screen.queryByText(/don't equal/)).not.toBeInTheDocument();
  });

  it('shows invalid message when amounts do not balance', () => {
    render(<SplitCalculator {...defaultProps} user1Amount={60} user2Amount={50} />);
    expect(screen.getByText(/don't equal/)).toBeInTheDocument();
  });

  it('shows percentage number inputs for percentage split type', () => {
    render(<SplitCalculator {...defaultProps} splitType="percentage" />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows amount inputs for fixed split type', () => {
    render(<SplitCalculator {...defaultProps} splitType="fixed" />);
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows income fairness panel when income-based split with both incomes provided', () => {
    render(<SplitCalculator
      {...defaultProps}
      splitType="income-based"
      partnership={{
        id: 'partnership-1',
        space_id: 'space-1',
        user1_income: 60000,
        user2_income: 40000,
        created_at: '2026-01-01',
      }}
    />);
    // Fair Split Calculation panel requires both user1_income and user2_income
    expect(screen.getByText(/Fair Split Calculation/i)).toBeInTheDocument();
  });

  it('calls onPercentageChange when percentage input changes', () => {
    const onPercentageChange = vi.fn();
    render(<SplitCalculator {...defaultProps} splitType="percentage" onPercentageChange={onPercentageChange} />);
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '60' } });
    expect(onPercentageChange).toHaveBeenCalled();
  });
});
