// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillCard } from '@/components/projects/BillCard';
import type { Bill } from '@/lib/services/bills-service';

const futureDateISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const baseBill: Bill = {
  id: 'bill-1',
  space_id: 'space-1',
  name: 'Electric Bill',
  amount: 120.5,
  due_date: futureDateISO,
  frequency: 'monthly',
  status: 'pending',
  category: 'Utilities',
  payee: 'Power Co',
  notes: 'Pay online',
  reminder_enabled: true,
  reminder_days: 3,
  last_paid_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('BillCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders bill name', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText('Electric Bill')).toBeTruthy();
  });

  it('renders bill amount', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText('120.50')).toBeTruthy();
  });

  it('renders payee when provided', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText(/pay to:/i)).toBeTruthy();
    expect(screen.getByText(/power co/i)).toBeTruthy();
  });

  it('renders category badge', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText('Utilities')).toBeTruthy();
  });

  it('renders Mark As Paid button for unpaid bill', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText(/mark as paid/i)).toBeTruthy();
  });

  it('calls onMarkPaid when Mark As Paid is clicked', () => {
    const onMarkPaid = vi.fn();
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={onMarkPaid} />);
    fireEvent.click(screen.getByText(/mark as paid/i));
    expect(onMarkPaid).toHaveBeenCalledWith('bill-1');
  });

  it('does not render Mark As Paid for paid bill', () => {
    render(
      <BillCard
        bill={{ ...baseBill, status: 'paid' }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMarkPaid={vi.fn()}
      />
    );
    expect(screen.queryByText(/mark as paid/i)).toBeNull();
  });

  it('renders notes text', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    expect(screen.getByText('Pay online')).toBeTruthy();
  });

  it('opens options menu and shows Edit/Delete', () => {
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    const menuBtn = screen.getByLabelText('Bill options');
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls onEdit when Edit is clicked from menu', () => {
    const onEdit = vi.fn();
    render(<BillCard bill={baseBill} onEdit={onEdit} onDelete={vi.fn()} onMarkPaid={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Bill options'));
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(baseBill);
  });

  it('calls onDelete when Delete is clicked from menu', () => {
    const onDelete = vi.fn();
    render(<BillCard bill={baseBill} onEdit={vi.fn()} onDelete={onDelete} onMarkPaid={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Bill options'));
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith('bill-1');
  });
});
