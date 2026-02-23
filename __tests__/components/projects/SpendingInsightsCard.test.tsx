// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/services/spending-insights-service', () => ({
  spendingInsightsService: {
    getSpendingInsights: vi.fn().mockResolvedValue({
      current_period: {
        total_spent: 1200,
        total_budget: 2000,
        variance: 800,
        variance_percentage: 40,
      },
      trends: [
        { period: 'Jan', total_spent: 1200, transaction_count: 15 },
      ],
      top_categories: [
        { category: 'Food', total: 400, percentage: 33, transaction_count: 8 },
      ],
      budget_variances: [],
    }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('SpendingInsightsCard', () => {
  it('renders without crashing', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    const { container } = render(<SpendingInsightsCard spaceId="space-1" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows loading skeleton initially', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    const { container } = render(<SpendingInsightsCard spaceId="space-1" />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
  });

  it('renders Spending Insights title after loading', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    render(<SpendingInsightsCard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Spending Insights')).toBeTruthy();
    });
  });

  it('renders total spent amount', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    render(<SpendingInsightsCard spaceId="space-1" />);
    await waitFor(() => {
      // Multiple elements may show $1,200; use getAllByText and verify at least one exists
      const elements = screen.getAllByText('$1,200');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('renders time range toggle buttons', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    render(<SpendingInsightsCard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /monthly/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /quarterly/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /yearly/i })).toBeTruthy();
    });
  });

  it('renders top category', async () => {
    const { SpendingInsightsCard } = await import('@/components/projects/SpendingInsightsCard');
    render(<SpendingInsightsCard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeTruthy();
    });
  });
});
