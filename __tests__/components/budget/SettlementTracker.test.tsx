// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SettlementTracker } from '@/components/budget/SettlementTracker';

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    currentSpace: { id: 'space-1', name: 'Test Space' },
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/expense-splitting-service', () => ({
  getExpenseSplits: vi.fn().mockResolvedValue([]),
  settleExpenseSplit: vi.fn().mockResolvedValue({}),
  createSettlement: vi.fn().mockResolvedValue({}),
  getSettlements: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('SettlementTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    expect(screen.getByText('Loading settlement data...')).toBeInTheDocument();
  });

  it('shows Settlement Tracking header after loading', async () => {
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Settlement Tracking')).toBeInTheDocument();
    });
  });

  it('does not show settlement history when no settlements exist', async () => {
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Settlement Tracking')).toBeInTheDocument();
    });
    // Settlement History section only renders when settlements.length > 0
    expect(screen.queryByText('Settlement History')).not.toBeInTheDocument();
  });

  it('shows split information when splits exist', async () => {
    const { getExpenseSplits } = await import('@/lib/services/expense-splitting-service');
    vi.mocked(getExpenseSplits).mockResolvedValueOnce([
      {
        id: 'split-1',
        expense_id: 'expense-1',
        user_id: 'user-1',
        amount_owed: 50,
        amount_paid: 0,
        percentage: 50,
        is_payer: false,
        status: 'pending',
        settled_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      // $50.00 may appear in multiple places — use getAllByText
      expect(screen.getAllByText(/\$50\.00/).length).toBeGreaterThan(0);
    });
  });

  it('shows error message when data load fails', async () => {
    const { getExpenseSplits } = await import('@/lib/services/expense-splitting-service');
    vi.mocked(getExpenseSplits).mockRejectedValueOnce(new Error('Load failed'));
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load settlement data')).toBeInTheDocument();
    });
  });

  it('shows Record Payment button when unsettled splits exist', async () => {
    const { getExpenseSplits } = await import('@/lib/services/expense-splitting-service');
    vi.mocked(getExpenseSplits).mockResolvedValueOnce([
      {
        id: 'split-1',
        expense_id: 'expense-1',
        user_id: 'user-1',
        amount_owed: 50,
        amount_paid: 0,
        percentage: 50,
        is_payer: false,
        status: 'pending',
        settled_at: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);
    render(<SettlementTracker expenseId="expense-1" spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Record Payment')).toBeInTheDocument();
    });
  });
});
