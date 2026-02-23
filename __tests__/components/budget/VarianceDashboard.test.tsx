// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import VarianceDashboard from '@/components/budget/VarianceDashboard';

// Define mock return values inline to avoid hoisting issues
vi.mock('@/lib/services/variance-analysis-service', () => ({
  varianceAnalysisService: {
    getCurrentMonthVariance: vi.fn().mockResolvedValue({
      month: '2026-02',
      total_budgeted: 5000,
      total_actual: 4200,
      total_variance: -800,
      variance_percentage: -16,
      categories: [],
    }),
    getProjectedMonthEndVariance: vi.fn().mockResolvedValue({
      month: '2026-02',
      total_budgeted: 5000,
      total_actual: 5500,
      total_variance: 500,
      variance_percentage: 10,
      categories: [],
    }),
    getProblematicCategories: vi.fn().mockResolvedValue([]),
    getPerformingCategories: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

describe('VarianceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.queryByText('Loading variance analysis...')).not.toBeInTheDocument();
    });
  });

  it('shows loading message initially', () => {
    render(<VarianceDashboard spaceId="space-1" />);
    expect(screen.getByText('Loading variance analysis...')).toBeInTheDocument();
  });

  it('shows current month section after loading', async () => {
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Current Month')).toBeInTheDocument();
    });
  });

  it('shows projected section after loading', async () => {
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      // "Projected" heading appears in the projected end-of-month card
      expect(screen.getByText('Projected')).toBeInTheDocument();
    });
  });

  it('shows budget total', async () => {
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getAllByText(/5,000/).length).toBeGreaterThan(0);
    });
  });

  it('shows Over Budget categories section when categories have over status', async () => {
    const { varianceAnalysisService } = await import('@/lib/services/variance-analysis-service');
    vi.mocked(varianceAnalysisService.getProblematicCategories).mockResolvedValueOnce([
      {
        category: 'Dining',
        budgeted_amount: 300,
        actual_amount: 450,
        variance: 150,
        variance_percentage: 50,
        status: 'over',
        color: 'red',
      },
    ]);
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      // Problematic categories section shows "Needs Attention" heading
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    });
  });

  it('shows Well Performing categories section when performing categories exist', async () => {
    const { varianceAnalysisService } = await import('@/lib/services/variance-analysis-service');
    vi.mocked(varianceAnalysisService.getPerformingCategories).mockResolvedValueOnce([
      {
        category: 'Groceries',
        budgeted_amount: 500,
        actual_amount: 350,
        variance: -150,
        variance_percentage: -30,
        status: 'under',
        color: 'green',
      },
    ]);
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      // Performing categories section shows "Doing Great" heading
      expect(screen.getByText('Doing Great')).toBeInTheDocument();
    });
  });

  it('shows problematic categories when they exist', async () => {
    const { varianceAnalysisService } = await import('@/lib/services/variance-analysis-service');
    vi.mocked(varianceAnalysisService.getProblematicCategories).mockResolvedValueOnce([
      {
        category: 'Dining',
        budgeted_amount: 300,
        actual_amount: 450,
        variance: 150,
        variance_percentage: 50,
        status: 'over',
        color: 'red',
      },
    ]);
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Dining')).toBeInTheDocument();
    });
  });

  it('shows empty state when no current variance data', async () => {
    const { varianceAnalysisService } = await import('@/lib/services/variance-analysis-service');
    vi.mocked(varianceAnalysisService.getCurrentMonthVariance).mockResolvedValueOnce(null);
    render(<VarianceDashboard spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No budget data available for analysis')).toBeInTheDocument();
    });
  });
});
