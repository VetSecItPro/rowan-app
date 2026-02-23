// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/validations/expense-splitting', () => ({
  safeValidateUpdateSplitExpense: vi.fn((data) => ({ success: true, data })),
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    isOpen,
    children,
    title,
    subtitle,
    footer,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    footer?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        {subtitle && <div data-testid="modal-subtitle">{subtitle}</div>}
        <div>{children}</div>
        {footer && <div data-testid="modal-footer">{footer}</div>}
      </div>
    ) : null,
}));

vi.mock('@/components/expenses/SplitTypeSelector', () => ({
  SplitTypeSelector: ({
    selectedType,
    onSelect,
  }: {
    selectedType: string;
    onSelect: (type: string) => void;
  }) => (
    <div data-testid="split-type-selector" data-selected={selectedType}>
      <button onClick={() => onSelect('percentage')}>percentage</button>
    </div>
  ),
}));

vi.mock('@/components/expenses/SplitCalculator', () => ({
  SplitCalculator: ({
    onCalculate,
  }: {
    onCalculate: (result: { user1Amount: number; user2Amount: number; user1Percentage: number; user2Percentage: number }) => void;
  }) => (
    <div
      data-testid="split-calculator"
      onClick={() =>
        onCalculate({ user1Amount: 50, user2Amount: 50, user1Percentage: 50, user2Percentage: 50 })
      }
    />
  ),
}));

import { ExpenseSplitModal } from '@/components/expenses/ExpenseSplitModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  expenseId: 'exp-1',
  expenseName: 'Groceries',
  totalAmount: 100,
  user1Id: 'u1',
  user1Name: 'Alice',
  user2Id: 'u2',
  user2Name: 'Bob',
  onSave: vi.fn(),
};

describe('ExpenseSplitModal', () => {
  it('renders without crashing when open', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows modal title', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Split Expense');
  });

  it('shows expense name as subtitle', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('modal-subtitle')).toHaveTextContent('Groceries');
  });

  it('renders SplitTypeSelector', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('split-type-selector')).toBeInTheDocument();
  });

  it('renders SplitCalculator', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('split-calculator')).toBeInTheDocument();
  });

  it('renders step headings', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByText('Step 1: Choose Split Method')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Review Split')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ExpenseSplitModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders footer with Cancel and Save Split buttons', () => {
    render(<ExpenseSplitModal {...defaultProps} />);
    expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Split')).toBeInTheDocument();
  });
});
