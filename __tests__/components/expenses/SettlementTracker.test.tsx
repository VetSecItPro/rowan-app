// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { SettlementTracker } from '@/components/expenses/SettlementTracker';

const makeSettlement = (id: string, fromUser: boolean = true) => ({
  id,
  from_user_id: fromUser ? 'user-1' : 'user-2',
  to_user_id: fromUser ? 'user-2' : 'user-1',
  amount: 50,
  settlement_date: '2024-02-15',
  payment_method: 'Venmo',
  reference_number: null,
  notes: null,
  expense_ids: [],
  space_id: 'space-1',
  created_at: '2024-02-15',
});

describe('SettlementTracker', () => {
  it('renders empty state when no settlements', () => {
    render(
      <SettlementTracker settlements={[]} currentUserId="user-1" />
    );
    expect(screen.getByText('No settlement history yet')).toBeInTheDocument();
  });

  it('renders settlement history when settlements exist', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('Settlement History')).toBeInTheDocument();
  });

  it('shows settlement count', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('1 settlement')).toBeInTheDocument();
  });

  it('shows total settled amount', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('Total Settled')).toBeInTheDocument();
  });

  it('shows "You paid" when settlement is from current user', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1', true)]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('You paid')).toBeInTheDocument();
  });

  it('shows "You received" when settlement is to current user', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1', false)]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('You received')).toBeInTheDocument();
  });

  it('shows payment method when provided', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('via Venmo')).toBeInTheDocument();
  });

  it('renders delete button when onDelete provided', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Delete settlement')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1')]}
        currentUserId="user-1"
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText('Delete settlement'));
    expect(onDelete).toHaveBeenCalledWith('s1');
  });

  it('groups settlements by month', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1'), makeSettlement('s2')]}
        currentUserId="user-1"
      />
    );
    // Both settlements are in February 2024
    expect(screen.getByText('February 2024')).toBeInTheDocument();
  });

  it('shows plural "settlements" when count > 1', () => {
    render(
      <SettlementTracker
        settlements={[makeSettlement('s1'), makeSettlement('s2')]}
        currentUserId="user-1"
      />
    );
    expect(screen.getByText('2 settlements')).toBeInTheDocument();
  });
});
