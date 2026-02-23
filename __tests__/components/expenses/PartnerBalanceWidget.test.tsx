// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PartnerBalanceWidget } from '@/components/expenses/PartnerBalanceWidget';

const makeBalance = (userId: string, netBalance: number) => ({
  user_id: userId,
  net_balance: netBalance,
  amount_owed: netBalance < 0 ? Math.abs(netBalance) : 0,
  amount_owed_to_them: netBalance > 0 ? netBalance : 0,
});

describe('PartnerBalanceWidget', () => {
  it('renders without crashing', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', 0)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
  });

  it('shows settled state when balance is zero', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', 0)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText('All Settled Up!')).toBeInTheDocument();
  });

  it('shows partner name in settled text', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', 0)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText(/You and Bob are even/)).toBeInTheDocument();
  });

  it('shows "You owe" when net balance is negative', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', -50)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText(/You owe Bob/)).toBeInTheDocument();
  });

  it('shows "owes you" when net balance is positive', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', 75)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText(/Bob owes you/)).toBeInTheDocument();
  });

  it('renders settle up button when not balanced and onSettleUp provided', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', -50)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
        onSettleUp={vi.fn()}
      />
    );
    expect(screen.getByText('Pay')).toBeInTheDocument();
  });

  it('calls onSettleUp when settle up button clicked', () => {
    const onSettleUp = vi.fn();
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', -50)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
        onSettleUp={onSettleUp}
      />
    );
    fireEvent.click(screen.getByText('Pay'));
    expect(onSettleUp).toHaveBeenCalledTimes(1);
  });

  it('shows "Request Payment" when partner owes current user', () => {
    render(
      <PartnerBalanceWidget
        balances={[makeBalance('u1', 100)]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
        onSettleUp={vi.fn()}
      />
    );
    expect(screen.getByText('Request Payment')).toBeInTheDocument();
  });

  it('handles empty balances gracefully', () => {
    render(
      <PartnerBalanceWidget
        balances={[]}
        currentUserId="u1"
        currentUserName="Alice"
        partnerName="Bob"
      />
    );
    expect(screen.getByText('All Settled Up!')).toBeInTheDocument();
  });
});
