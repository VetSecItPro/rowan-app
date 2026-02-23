// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard } from '@/components/projects/ExpenseCard';
import type { Expense } from '@/lib/services/budgets-service';

vi.mock('@/lib/utils/date-utils', () => ({
  formatTimestamp: vi.fn(() => 'Jan 15'),
}));

const baseExpense: Expense = {
  id: 'expense-1',
  space_id: 'space-1',
  title: 'Grocery Shopping',
  amount: 85.5,
  category: 'Food',
  status: 'pending',
  due_date: '2026-01-15',
  recurring: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ExpenseCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders expense title', () => {
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText('Grocery Shopping')).toBeTruthy();
  });

  it('renders expense amount', () => {
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText('$85.50')).toBeTruthy();
  });

  it('renders category', () => {
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('renders pending status badge', () => {
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText('pending')).toBeTruthy();
  });

  it('renders paid status badge for paid expense', () => {
    render(
      <ExpenseCard expense={{ ...baseExpense, status: 'paid' }} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />
    );
    expect(screen.getByText('paid')).toBeTruthy();
  });

  it('shows mark-as-paid button for pending expense', () => {
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByLabelText('Mark expense as paid')).toBeTruthy();
  });

  it('calls onStatusChange when mark-as-paid is clicked', () => {
    const onStatusChange = vi.fn();
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText('Mark expense as paid'));
    expect(onStatusChange).toHaveBeenCalledWith('expense-1', 'paid');
  });

  it('opens options menu and calls onEdit', () => {
    const onEdit = vi.fn();
    render(<ExpenseCard expense={baseExpense} onEdit={onEdit} onDelete={vi.fn()} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expense options menu'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(baseExpense);
  });

  it('opens options menu and calls onDelete', () => {
    const onDelete = vi.fn();
    render(<ExpenseCard expense={baseExpense} onEdit={vi.fn()} onDelete={onDelete} onStatusChange={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expense options menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('expense-1');
  });
});
