// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PatternCard } from '@/components/expenses/PatternCard';

const basePattern = {
  id: 'pattern-1',
  pattern_name: 'Netflix',
  merchant_name: 'Netflix Inc.',
  frequency: 'monthly',
  average_amount: 15.99,
  amount_variance: 0,
  occurrence_count: 6,
  confidence_score: 92,
  first_occurrence: '2023-09-01',
  last_occurrence: '2024-02-01',
  next_expected_date: '2024-03-01',
  next_expected_amount: 15.99,
  category: 'Entertainment',
  user_confirmed: false,
  user_ignored: false,
  auto_created: false,
  space_id: 'space-1',
  created_at: '2023-09-01',
  updated_at: '2024-02-01',
};

describe('PatternCard', () => {
  it('renders without crashing', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders pattern name', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('renders merchant name', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('Netflix Inc.')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('renders confidence score', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('renders occurrence count', () => {
    render(<PatternCard pattern={basePattern} />);
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders action buttons when onAction provided and pattern not confirmed/ignored', () => {
    render(<PatternCard pattern={basePattern} onAction={vi.fn()} />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Create Expense')).toBeInTheDocument();
    expect(screen.getByText('Ignore')).toBeInTheDocument();
  });

  it('calls onAction with "confirm" when Confirm button clicked', () => {
    const onAction = vi.fn();
    render(<PatternCard pattern={basePattern} onAction={onAction} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onAction).toHaveBeenCalledWith('confirm');
  });

  it('calls onAction with "create" when Create Expense button clicked', () => {
    const onAction = vi.fn();
    render(<PatternCard pattern={basePattern} onAction={onAction} />);
    fireEvent.click(screen.getByText('Create Expense'));
    expect(onAction).toHaveBeenCalledWith('create');
  });

  it('calls onAction with "ignore" when Ignore button clicked', () => {
    const onAction = vi.fn();
    render(<PatternCard pattern={basePattern} onAction={onAction} />);
    fireEvent.click(screen.getByText('Ignore'));
    expect(onAction).toHaveBeenCalledWith('ignore');
  });

  it('does not render action buttons when pattern is confirmed', () => {
    render(
      <PatternCard
        pattern={{ ...basePattern, user_confirmed: true }}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('does not render action buttons when pattern is ignored', () => {
    render(
      <PatternCard
        pattern={{ ...basePattern, user_ignored: true }}
        onAction={vi.fn()}
      />
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('shows Confirmed badge when user_confirmed is true', () => {
    render(<PatternCard pattern={{ ...basePattern, user_confirmed: true }} />);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows Ignored badge when user_ignored is true', () => {
    render(<PatternCard pattern={{ ...basePattern, user_ignored: true }} />);
    expect(screen.getByText('Ignored')).toBeInTheDocument();
  });

  it('disables buttons when isProcessing is true', () => {
    render(<PatternCard pattern={basePattern} onAction={vi.fn()} isProcessing={true} />);
    expect(screen.getByText('Confirm')).toBeDisabled();
  });
});
