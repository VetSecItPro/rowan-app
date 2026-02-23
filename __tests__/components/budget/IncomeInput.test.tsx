// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IncomeInput } from '@/components/budget/IncomeInput';

vi.mock('@/lib/validations/budget-templates', () => ({
  safeValidateMonthlyIncome: vi.fn((value: number) => {
    if (value < 0) return { success: false, error: { issues: [{ message: 'Income must be positive' }] } };
    if (value > 10000000) return { success: false, error: { issues: [{ message: 'Income exceeds maximum' }] } };
    return { success: true };
  }),
}));

describe('IncomeInput', () => {
  const defaultProps = {
    value: 5000,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<IncomeInput {...defaultProps} />);
    expect(screen.getByLabelText(/Monthly Income/)).toBeInTheDocument();
  });

  it('shows default label', () => {
    render(<IncomeInput {...defaultProps} />);
    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
  });

  it('shows custom label', () => {
    render(<IncomeInput {...defaultProps} label="Annual Income" />);
    expect(screen.getByText('Annual Income')).toBeInTheDocument();
  });

  it('shows help text', () => {
    render(<IncomeInput {...defaultProps} />);
    expect(screen.getByText('Enter your total monthly household income')).toBeInTheDocument();
  });

  it('shows custom help text', () => {
    render(<IncomeInput {...defaultProps} helpText="Enter your salary" />);
    expect(screen.getByText('Enter your salary')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<IncomeInput {...defaultProps} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows dollar sign prefix', () => {
    render(<IncomeInput {...defaultProps} />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    render(<IncomeInput {...defaultProps} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '6000' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(6000);
  });

  it('calls onChange with 0 when cleared', () => {
    render(<IncomeInput {...defaultProps} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(0);
  });

  it('shows validation error after blur with empty required field', () => {
    render(<IncomeInput {...defaultProps} value={0} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(screen.getByText('Monthly income is required')).toBeInTheDocument();
  });

  it('calls onValidChange callback', () => {
    const onValidChange = vi.fn();
    render(<IncomeInput {...defaultProps} onValidChange={onValidChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.blur(input);
    expect(onValidChange).toHaveBeenCalledWith(true);
  });

  it('shows success amount display after valid input', () => {
    render(<IncomeInput {...defaultProps} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.blur(input);
    expect(screen.getByText('$5,000/month')).toBeInTheDocument();
  });
});
