// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SplitTypeSelector } from '@/components/expenses/SplitTypeSelector';

describe('SplitTypeSelector', () => {
  it('renders without crashing', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} />);
    expect(screen.getByText('Equal Split')).toBeInTheDocument();
  });

  it('renders all four split type options', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} />);
    expect(screen.getByText('Equal Split')).toBeInTheDocument();
    expect(screen.getByText('Percentage')).toBeInTheDocument();
    expect(screen.getByText('Fixed Amount')).toBeInTheDocument();
    expect(screen.getByText('Income-Based')).toBeInTheDocument();
  });

  it('renders descriptions for each type', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} />);
    expect(screen.getByText('50/50 split between partners')).toBeInTheDocument();
    expect(screen.getByText('Custom percentage for each partner')).toBeInTheDocument();
    expect(screen.getByText('Specific dollar amounts for each')).toBeInTheDocument();
    expect(screen.getByText('Split proportional to incomes')).toBeInTheDocument();
  });

  it('marks the currently selected type with aria-pressed', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} />);
    const equalButton = screen.getByRole('button', { name: /Equal Split/ });
    expect(equalButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not mark unselected types as pressed', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} />);
    const percentageButton = screen.getByRole('button', { name: /Percentage/ });
    expect(percentageButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with correct type when button clicked', () => {
    const onSelect = vi.fn();
    render(<SplitTypeSelector selectedType="equal" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Percentage/ }));
    expect(onSelect).toHaveBeenCalledWith('percentage');
  });

  it('calls onSelect with "fixed" when Fixed Amount clicked', () => {
    const onSelect = vi.fn();
    render(<SplitTypeSelector selectedType="equal" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Fixed Amount/ }));
    expect(onSelect).toHaveBeenCalledWith('fixed');
  });

  it('calls onSelect with "income-based" when Income-Based clicked', () => {
    const onSelect = vi.fn();
    render(<SplitTypeSelector selectedType="equal" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Income-Based/ }));
    expect(onSelect).toHaveBeenCalledWith('income-based');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<SplitTypeSelector selectedType="equal" onSelect={vi.fn()} disabled={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<SplitTypeSelector selectedType="equal" onSelect={onSelect} disabled={true} />);
    fireEvent.click(screen.getByRole('button', { name: /Percentage/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows (Selected) label for currently selected type', () => {
    render(<SplitTypeSelector selectedType="percentage" onSelect={vi.fn()} />);
    expect(screen.getByText('(Selected)')).toBeInTheDocument();
  });
});
