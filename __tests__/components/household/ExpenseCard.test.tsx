// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard } from '@/components/household/ExpenseCard';
import type { Expense } from '@/lib/types';

vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Jan 1'),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'expense-1',
  space_id: 'space-1',
  title: 'Electric Bill',
  amount: 120.50,
  category: 'Utilities',
  status: 'pending',
  due_date: '2026-02-28',
  recurring: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('ExpenseCard', () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('displays the expense title', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Electric Bill')).toBeTruthy();
  });

  it('displays the formatted amount', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('$120.50')).toBeTruthy();
  });

  it('displays the category', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('Utilities')).toBeTruthy();
  });

  it('displays the status badge', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('pending')).toBeTruthy();
  });

  it('shows paid status when status is paid', () => {
    render(<ExpenseCard expense={makeExpense({ status: 'paid' })} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText('paid')).toBeTruthy();
  });

  it('opens the options menu when more-options button is clicked', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    const menuBtn = screen.getByLabelText('Expense options menu');
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when edit option is clicked', () => {
    const expense = makeExpense();
    render(<ExpenseCard expense={expense} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Expense options menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(expense);
  });

  it('calls onDelete when delete option is clicked', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Expense options menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('expense-1');
  });

  it('closes the menu when overlay is clicked', () => {
    render(<ExpenseCard expense={makeExpense()} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Expense options menu'));
    expect(screen.getByText('Edit')).toBeTruthy();
    // Click the fixed overlay to close
    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByText('Edit')).toBeNull();
  });
});
