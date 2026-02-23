// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn(), isFetching: false })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(),
}));

vi.mock('@/components/admin/ComparisonContext', () => ({
  useComparison: vi.fn(() => ({ compareEnabled: false })),
}));

vi.mock('@/components/admin/DrillDownModal', () => ({
  DrillDownModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="drill-down-modal">{children}</div> : null,
}));

vi.mock('@/components/admin/DrillDownChart', () => ({
  DrillDownChart: () => <div data-testid="drill-down-chart" />,
}));

vi.mock('@/lib/constants/benchmarks', () => ({
  getBenchmarkLevel: vi.fn(() => 'good'),
  getBenchmarkColor: vi.fn(() => 'text-green-400'),
  getBenchmarkBgColor: vi.fn(() => 'bg-green-900/20'),
}));

import { RetentionPanel } from '@/components/admin/panels/RetentionPanel';

const mockUseQuery = vi.mocked(useQuery);

const safeEmptyResult = {
  data: undefined,
  isLoading: false,
  refetch: vi.fn(),
  isFetching: false,
} as ReturnType<typeof useQuery>;

describe('RetentionPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(safeEmptyResult);
  });

  it('renders without crashing', () => {
    const { container } = render(<RetentionPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders DAU / MAU tab', () => {
    render(<RetentionPanel />);
    expect(screen.getByText('DAU / MAU')).toBeTruthy();
  });

  it('renders Cohorts tab', () => {
    render(<RetentionPanel />);
    expect(screen.getByText('Cohorts')).toBeTruthy();
  });

  it('renders Churn tab', () => {
    render(<RetentionPanel />);
    expect(screen.getByText('Churn')).toBeTruthy();
  });

  it('shows loading spinner in DAU/MAU panel when loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<RetentionPanel />);
    // DauMauPanel shows a spinner div when loading, not text
    // The component renders a spinner without text — check for the animate-spin element
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders stickiness info when data is available', () => {
    // RetentionPanel makes multiple useQuery calls — use mockReturnValue for all
    mockUseQuery.mockReturnValue({
      data: {
        dau: 50,
        wau: 150,
        mau: 400,
        stickiness: 12.5,
        stickinessLabel: 'Good for most apps',
        dauTrend: [],
        cohorts: [],
        churn: { rate: 5, churned: 10, retained: 390 },
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<RetentionPanel />);
    // "Stickiness" appears in multiple places — use getAllByText
    expect(screen.getAllByText(/Stickiness/).length).toBeGreaterThan(0);
  });

  it('switches to Cohorts tab on click', () => {
    render(<RetentionPanel />);
    fireEvent.click(screen.getByText('Cohorts'));
    const tab = screen.getByText('Cohorts');
    // RetentionPanel uses purple-500 for active tab
    expect(tab.closest('button')?.className).toContain('border-purple-500');
  });
});
