// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('use-debounce', () => ({
  useDebounce: (value: string) => [value],
}));

vi.mock('@/components/expenses/PatternCard', () => ({
  PatternCard: ({
    pattern,
    onAction,
  }: {
    pattern: { pattern_name: string; id: string };
    onAction?: (action: string) => void;
  }) => (
    <div data-testid={`pattern-card-${pattern.id}`}>
      <span>{pattern.pattern_name}</span>
      {onAction && (
        <button onClick={() => onAction('confirm')}>confirm-{pattern.id}</button>
      )}
    </div>
  ),
}));

import { RecurringPatternsList } from '@/components/expenses/RecurringPatternsList';

const makePattern = (id: string, overrides = {}) => ({
  id,
  pattern_name: `Pattern ${id}`,
  merchant_name: `Merchant ${id}`,
  frequency: 'monthly',
  average_amount: 10,
  amount_variance: 0,
  occurrence_count: 3,
  confidence_score: 85,
  first_occurrence: '2024-01-01',
  last_occurrence: '2024-03-01',
  next_expected_date: '2024-04-01',
  next_expected_amount: 10,
  category: 'Subscriptions',
  user_confirmed: false,
  user_ignored: false,
  auto_created: false,
  space_id: 'space-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

describe('RecurringPatternsList', () => {
  it('renders empty state when no patterns', () => {
    render(<RecurringPatternsList patterns={[]} />);
    expect(screen.getByText('No Recurring Patterns Detected')).toBeInTheDocument();
  });

  it('renders Run Analysis button in empty state when onRefresh provided', () => {
    render(<RecurringPatternsList patterns={[]} onRefresh={vi.fn()} />);
    expect(screen.getByText('Run Analysis')).toBeInTheDocument();
  });

  it('calls onRefresh when Run Analysis clicked', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<RecurringPatternsList patterns={[]} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Run Analysis'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders patterns when provided', () => {
    render(
      <RecurringPatternsList
        patterns={[makePattern('p1'), makePattern('p2')]}
      />
    );
    expect(screen.getByTestId('pattern-card-p1')).toBeInTheDocument();
    expect(screen.getByTestId('pattern-card-p2')).toBeInTheDocument();
  });

  it('renders stats bar with correct total', () => {
    render(
      <RecurringPatternsList patterns={[makePattern('p1'), makePattern('p2')]} />
    );
    expect(screen.getByText('Total Patterns')).toBeInTheDocument();
    // Use getAllByText since "2" may appear in multiple stat cells
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders search input', () => {
    render(<RecurringPatternsList patterns={[makePattern('p1')]} />);
    expect(screen.getByPlaceholderText('Search patterns...')).toBeInTheDocument();
  });

  it('renders filter dropdown', () => {
    render(<RecurringPatternsList patterns={[makePattern('p1')]} />);
    expect(screen.getByDisplayValue('All Patterns')).toBeInTheDocument();
  });

  it('renders sort dropdown', () => {
    render(<RecurringPatternsList patterns={[makePattern('p1')]} />);
    expect(screen.getByDisplayValue('Highest Confidence')).toBeInTheDocument();
  });

  it('renders Refresh button when onRefresh provided', () => {
    render(
      <RecurringPatternsList
        patterns={[makePattern('p1')]}
        onRefresh={vi.fn()}
      />
    );
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('shows no results message when search yields nothing', () => {
    render(<RecurringPatternsList patterns={[makePattern('p1')]} />);
    const search = screen.getByPlaceholderText('Search patterns...');
    fireEvent.change(search, { target: { value: 'zzznomatch' } });
    expect(screen.getByText('No patterns match your search or filter criteria')).toBeInTheDocument();
  });

  it('shows Needs Review stat label', () => {
    render(
      <RecurringPatternsList patterns={[makePattern('p1'), makePattern('p2')]} />
    );
    // "Needs Review" appears in both the stat label and the filter dropdown option
    expect(screen.getAllByText('Needs Review').length).toBeGreaterThanOrEqual(1);
  });
});
