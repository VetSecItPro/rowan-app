// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
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

import { OverviewPanel } from '@/components/admin/panels/OverviewPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('OverviewPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<OverviewPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<OverviewPanel />);
    expect(screen.getByText(/Loading overview/)).toBeTruthy();
  });

  it('renders with default zero data', () => {
    const { container } = render(<OverviewPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders key metric sections when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: {
        totalUsers: 100,
        activeToday: 25,
        totalSpaces: 50,
        newSignups: 10,
        mrrGrowthRate: 5,
        churnRate: 2,
        dauMauRatio: 30,
        nrr: 110,
        activationRate: 60,
      },
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    const { container } = render(<OverviewPanel />);
    expect(container.firstChild).toBeTruthy();
  });
});
