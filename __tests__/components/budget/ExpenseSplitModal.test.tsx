// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseSplitModal } from '@/components/budget/ExpenseSplitModal';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/expense-splitting-service', () => ({
  updateExpenseSplit: vi.fn().mockResolvedValue({}),
  calculateIncomeBasedSplit: vi.fn().mockReturnValue({
    user1Amount: 60,
    user2Amount: 40,
    user1Percentage: 60,
    user2Percentage: 40,
  }),
  getPartnershipBalance: vi.fn().mockResolvedValue(null),
  suggestSplitType: vi.fn().mockReturnValue('equal'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/components/budget/SplitTypeSelector', () => ({
  SplitTypeSelector: () => <div data-testid="split-type-selector">SplitTypeSelector</div>,
}));

vi.mock('@/components/budget/SplitCalculator', () => ({
  SplitCalculator: () => <div data-testid="split-calculator">SplitCalculator</div>,
}));

vi.mock('@/components/budget/SettlementTracker', () => ({
  SettlementTracker: () => <div data-testid="settlement-tracker">SettlementTracker</div>,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title }: { children: React.ReactNode; isOpen: boolean; title: string; footer?: React.ReactNode }) =>
    isOpen ? <div data-testid="modal"><h2>{title}</h2>{children}</div> : null,
}));

const mockExpense = {
  id: 'expense-1',
  title: 'Groceries',
  amount: 100,
  category: 'food',
};

describe('ExpenseSplitModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    expense: mockExpense,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExpenseSplitModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('displays expense title in modal', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Split Expense')).toBeInTheDocument();
  });

  it('shows ownership selection section', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Who is this expense for?')).toBeInTheDocument();
  });

  it('shows shared expense option', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Shared Expense')).toBeInTheDocument();
  });

  it('shows your expense option', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Your Expense')).toBeInTheDocument();
  });

  it('shows partner expense option', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText("Partner Expense")).toBeInTheDocument();
  });

  it('shows split configuration for shared expense', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Enable Splitting')).toBeInTheDocument();
  });

  it('shows SplitTypeSelector and SplitCalculator when shared and split enabled', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('split-type-selector')).toBeInTheDocument();
    expect(screen.getByTestId('split-calculator')).toBeInTheDocument();
  });
});
