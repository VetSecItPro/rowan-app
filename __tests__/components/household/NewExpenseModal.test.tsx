// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewExpenseModal } from '@/components/household/NewExpenseModal';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: { children: React.ReactNode; isOpen: boolean; title: string; footer?: React.ReactNode; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    );
  },
}));

describe('NewExpenseModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose,
    onSave,
    spaceId: 'space-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<NewExpenseModal {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when closed', () => {
    const { container } = render(<NewExpenseModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "New Expense" title when creating', () => {
    render(<NewExpenseModal {...defaultProps} />);
    expect(screen.getByText('New Expense')).toBeTruthy();
  });

  it('shows "Edit Expense" title when editing', () => {
    const editExpense = {
      id: 'exp-1', space_id: 'space-1', title: 'Old expense', amount: 50, category: 'Food',
      status: 'pending' as const, due_date: null, recurring: false,
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    };
    render(<NewExpenseModal {...defaultProps} editExpense={editExpense} />);
    expect(screen.getByText('Edit Expense')).toBeTruthy();
  });

  it('renders a title input', () => {
    render(<NewExpenseModal {...defaultProps} />);
    const titleLabel = screen.getByText('Title *');
    expect(titleLabel).toBeTruthy();
  });

  it('renders an amount input', () => {
    render(<NewExpenseModal {...defaultProps} />);
    const amountLabel = screen.getByText('Amount *');
    expect(amountLabel).toBeTruthy();
  });

  it('renders a category input', () => {
    render(<NewExpenseModal {...defaultProps} />);
    expect(screen.getByText('Category')).toBeTruthy();
  });

  it('renders a due date input', () => {
    render(<NewExpenseModal {...defaultProps} />);
    expect(screen.getByText('Due Date')).toBeTruthy();
  });

  it('renders cancel button', () => {
    render(<NewExpenseModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders create button when creating', () => {
    render(<NewExpenseModal {...defaultProps} />);
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('renders save button when editing', () => {
    const editExpense = {
      id: 'exp-1', space_id: 'space-1', title: 'Old expense', amount: 50, category: 'Food',
      status: 'pending' as const, due_date: null, recurring: false,
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    };
    render(<NewExpenseModal {...defaultProps} editExpense={editExpense} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<NewExpenseModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSave when form is submitted', () => {
    render(<NewExpenseModal {...defaultProps} />);
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New expense' } });
    const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(amountInput, { target: { value: '99.99' } });
    const form = document.getElementById('new-expense-form') as HTMLFormElement;
    fireEvent.submit(form);
    expect(onSave).toHaveBeenCalled();
    const callArg = onSave.mock.calls[0][0];
    expect(callArg.title).toBe('New expense');
    expect(callArg.space_id).toBe('space-1');
  });

  it('pre-fills fields when editing', () => {
    const editExpense = {
      id: 'exp-1', space_id: 'space-1', title: 'Pre-filled expense', amount: 75.25, category: 'Food',
      status: 'pending' as const, due_date: null, recurring: false,
      created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    };
    render(<NewExpenseModal {...defaultProps} editExpense={editExpense} />);
    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(titleInput.value).toBe('Pre-filled expense');
  });
});
