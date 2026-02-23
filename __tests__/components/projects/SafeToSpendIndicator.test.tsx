// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/budget-alerts-service', () => ({
  budgetAlertsService: {
    getSafeToSpendInfo: vi.fn().mockResolvedValue({
      safeToSpend: 500,
      status: 'safe',
      percentageUsed: 50,
      daysLeftInMonth: 15,
      dailyBudget: 33.33,
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('SafeToSpendIndicator', () => {
  it('renders without crashing', async () => {
    const { SafeToSpendIndicator } = await import('@/components/projects/SafeToSpendIndicator');
    const { container } = render(<SafeToSpendIndicator spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading skeleton initially', async () => {
    const { SafeToSpendIndicator } = await import('@/components/projects/SafeToSpendIndicator');
    const { container } = render(<SafeToSpendIndicator spaceId="space-1" />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });

  it('renders Safe to Spend label after loading', async () => {
    const { SafeToSpendIndicator } = await import('@/components/projects/SafeToSpendIndicator');
    render(<SafeToSpendIndicator spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Safe to Spend')).toBeTruthy();
    });
  });

  it('renders the safe amount after loading', async () => {
    const { SafeToSpendIndicator } = await import('@/components/projects/SafeToSpendIndicator');
    render(<SafeToSpendIndicator spaceId="space-1" />);
    await waitFor(() => {
      // Amount is displayed as "$500" where $ and 500 may be in adjacent elements
      // Use a regex to find any element containing "500"
      expect(screen.getByText(/500/)).toBeTruthy();
    });
  });

  it('renders daily budget guidance', async () => {
    const { SafeToSpendIndicator } = await import('@/components/projects/SafeToSpendIndicator');
    render(<SafeToSpendIndicator spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText(/33.33\/day/)).toBeTruthy();
    });
  });
});
