// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SplitTypeSelector } from '@/components/budget/SplitTypeSelector';

vi.mock('@/lib/services/expense-splitting-service', () => ({
  suggestSplitType: vi.fn().mockReturnValue('equal'),
}));

const defaultProps = {
  selectedType: 'equal' as const,
  onTypeChange: vi.fn(),
  expense: { amount: 100, category: 'food' },
  partnership: null,
};

describe('SplitTypeSelector', () => {
  it('renders without crashing', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText('Equal Split')).toBeInTheDocument();
  });

  it('shows all split type options', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText('Equal Split')).toBeInTheDocument();
    expect(screen.getByText('Percentage Split')).toBeInTheDocument();
    expect(screen.getByText('Fixed Amounts')).toBeInTheDocument();
    expect(screen.getByText('Income-Based Split')).toBeInTheDocument();
  });

  it('shows split recommendation when suggested type', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText(/Equal.*recommended/i)).toBeInTheDocument();
  });

  it('calls onTypeChange when percentage split is selected', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Percentage Split'));
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('percentage');
  });

  it('calls onTypeChange when fixed amounts is selected', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('Fixed Amounts'));
    expect(defaultProps.onTypeChange).toHaveBeenCalledWith('fixed');
  });

  it('shows income-based disabled warning without partnership income data', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText('Setup partner incomes to enable this option')).toBeInTheDocument();
  });

  it('does not show income-based warning when partnership has income data', () => {
    render(<SplitTypeSelector
      {...defaultProps}
      partnership={{
        user1_income: 60000,
        user2_income: 40000,
        space_id: 'space-1',
        id: 'partnership-1',
        created_at: '2026-01-01',
      }}
    />);
    expect(screen.queryByText('Setup partner incomes to enable this option')).not.toBeInTheDocument();
  });

  it('shows example amounts for equal split', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText('$50.00 each')).toBeInTheDocument();
  });

  it('shows income-based calculation panel when selected and partnership set', () => {
    render(<SplitTypeSelector
      {...defaultProps}
      selectedType="income-based"
      partnership={{
        user1_income: 60000,
        user2_income: 40000,
        space_id: 'space-1',
        id: 'partnership-1',
        created_at: '2026-01-01',
      }}
    />);
    expect(screen.getByText('Income-Based Calculation')).toBeInTheDocument();
  });

  it('shows how split is split header', () => {
    render(<SplitTypeSelector {...defaultProps} />);
    expect(screen.getByText('How should this be split?')).toBeInTheDocument();
  });
});
