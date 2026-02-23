// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PartnerBalanceWidget } from '@/components/budget/PartnerBalanceWidget';

vi.mock('@/lib/services/expense-splitting-service', () => ({
  calculateCurrentBalance: vi.fn().mockResolvedValue([]),
  getMonthlySettlementTrends: vi.fn().mockResolvedValue([]),
  getSplitExpenseStats: vi.fn().mockResolvedValue({
    totalSplit: 0,
    splitCount: 0,
    unsettledCount: 0,
    unsettledAmount: 0,
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('PartnerBalanceWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<PartnerBalanceWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Partner Balance')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<PartnerBalanceWidget spaceId="space-1" />);
    expect(screen.getByText('Loading balance...')).toBeInTheDocument();
  });

  it('shows All Settled Up when balances are zero', async () => {
    render(<PartnerBalanceWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('All Settled Up!')).toBeInTheDocument();
    });
  });

  it('shows statistics after loading', async () => {
    render(<PartnerBalanceWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Split Expenses')).toBeInTheDocument();
      expect(screen.getByText('Total Split')).toBeInTheDocument();
    });
  });

  it('shows error state when data fails to load', async () => {
    const { calculateCurrentBalance } = await import('@/lib/services/expense-splitting-service');
    vi.mocked(calculateCurrentBalance).mockRejectedValueOnce(new Error('Load failed'));
    render(<PartnerBalanceWidget spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load balance information')).toBeInTheDocument();
    });
  });

  it('renders with non-zero balance showing Net Balance display', async () => {
    const { calculateCurrentBalance } = await import('@/lib/services/expense-splitting-service');
    // net_balance values must NOT sum to 0 for hasBalance to be true.
    // user-1 owes user-2 $75 — net_balance of -75 for user-1, +75 for user-2
    // Total netBalance = -75 + 75 = 0... still 0.
    // The component computes netBalance = sum of ALL balances' net_balance.
    // For hasBalance to be true, we need only ONE balance entry OR non-symmetric values.
    vi.mocked(calculateCurrentBalance).mockResolvedValueOnce([
      {
        user_id: 'user-1',
        user_email: 'user1@test.com',
        amount_owed: 75,
        amount_owed_to_them: 0,
        net_balance: 75,
      },
    ]);
    render(<PartnerBalanceWidget spaceId="space-1" />);
    await waitFor(() => {
      // "Net Balance" appears in the center balance display when hasBalance is true
      expect(screen.getByText('Net Balance')).toBeInTheDocument();
    });
  });

  it('accepts className prop', async () => {
    const { container } = render(<PartnerBalanceWidget spaceId="space-1" className="custom-class" />);
    await waitFor(() => {
      expect(screen.getByText('Partner Balance')).toBeInTheDocument();
    });
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
