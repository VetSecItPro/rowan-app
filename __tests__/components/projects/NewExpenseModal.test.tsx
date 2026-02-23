// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({
    children,
    title,
    isOpen,
    footer,
  }: React.PropsWithChildren<{ title?: string; isOpen?: boolean; footer?: React.ReactNode }>) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'modal' }, [
          React.createElement('h2', { key: 'title' }, title),
          children,
          footer,
        ])
      : null,
}));

vi.mock('@/components/categories/CategorySelector', () => ({
  CategorySelector: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) =>
    React.createElement('select', {
      'data-testid': 'category-selector',
      value,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
    },
      React.createElement('option', { value: '' }, placeholder ?? 'Select category...')
    ),
}));

describe('NewExpenseModal', () => {
  it('renders without crashing when closed', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    const { container } = render(
      <NewExpenseModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(container).toBeTruthy();
  });

  it('renders modal when open', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByTestId('modal')).toBeTruthy();
  });

  it('renders Create New Expense title', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByText(/create new expense/i)).toBeTruthy();
  });

  it('renders Title input label', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByText(/^title \*/i)).toBeTruthy();
  });

  it('renders Amount input label', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByText(/^amount \*/i)).toBeTruthy();
  });

  it('renders Category label', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByText(/^category$/i)).toBeTruthy();
  });

  it('renders Due Date label', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByText(/due date/i)).toBeTruthy();
  });

  it('renders Create Expense button', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByRole('button', { name: /create expense/i })).toBeTruthy();
  });

  it('renders Cancel button', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} spaceId="space-1" />
    );
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });

  it('shows Edit Expense title and Save Expense button when editExpense provided', async () => {
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    const editExpense = {
      id: 'exp-1',
      space_id: 'space-1',
      title: 'Groceries',
      amount: 150,
      category: 'food',
      status: 'pending' as const,
      due_date: '',
      recurring: false,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    render(
      <NewExpenseModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        spaceId="space-1"
        editExpense={editExpense}
      />
    );
    expect(screen.getByText(/edit expense/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /save expense/i })).toBeTruthy();
  });

  it('calls onSave when form is submitted with valid data', async () => {
    const onSave = vi.fn();
    const { NewExpenseModal } = await import('@/components/projects/NewExpenseModal');
    render(
      <NewExpenseModal isOpen={true} onClose={vi.fn()} onSave={onSave} spaceId="space-1" />
    );
    // Fill in required Title field
    const titleInputs = screen.getAllByRole('textbox');
    fireEvent.change(titleInputs[0], { target: { value: 'Monthly rent' } });
    // Fill in required Amount field
    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: /create expense/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Monthly rent', amount: 1200 })
    );
  });
});
