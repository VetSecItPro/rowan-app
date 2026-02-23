// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SpendingInsightsDashboard from '@/components/budget/SpendingInsightsDashboard';

vi.mock('@/lib/services/spending-pattern-service', () => ({
  spendingPatternService: {
    analyzeSpendingPatterns: vi.fn().mockResolvedValue([]),
    generateSpendingInsights: vi.fn().mockResolvedValue([]),
    forecastNextMonthSpending: vi.fn().mockResolvedValue([]),
    analyzeDayOfWeekPatterns: vi.fn().mockResolvedValue([]),
    detectSpendingAnomalies: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('SpendingInsightsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Analyzing spending patterns...')).not.toBeInTheDocument();
    });
  });

  it('shows loading message initially', () => {
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    expect(screen.getByText('Analyzing spending patterns...')).toBeInTheDocument();
  });

  it('shows Key Insights section after loading', async () => {
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Key Insights & Recommendations')).toBeInTheDocument();
    });
  });

  it('shows empty insights message when no insights', async () => {
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      // Empty message is about tracking expenses for personalized recommendations
      expect(screen.getByText(/Keep tracking expenses to see personalized recommendations/i)).toBeInTheDocument();
    });
  });

  it('shows insights when data available', async () => {
    const { spendingPatternService } = await import('@/lib/services/spending-pattern-service');
    vi.mocked(spendingPatternService.generateSpendingInsights).mockResolvedValueOnce([
      {
        type: 'warning',
        category: 'Dining',
        message: 'Dining expenses increased 30%',
        impact: 150,
        severity: 'medium',
      },
    ]);
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Dining')).toBeInTheDocument();
    });
  });

  it('shows Spending Patterns section after loading', async () => {
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText(/Spending Patterns/i)).toBeInTheDocument();
    });
  });

  it('shows anomaly alerts when anomalies detected', async () => {
    const { spendingPatternService } = await import('@/lib/services/spending-pattern-service');
    vi.mocked(spendingPatternService.detectSpendingAnomalies).mockResolvedValueOnce([
      {
        type: 'warning',
        category: 'Shopping',
        message: 'Large purchase detected',
        impact: 500,
        severity: 'high',
      },
    ]);
    render(<SpendingInsightsDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Shopping')).toBeInTheDocument();
    });
  });
});
