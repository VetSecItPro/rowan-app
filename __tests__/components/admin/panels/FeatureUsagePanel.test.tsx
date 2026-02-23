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

import { FeatureUsagePanel } from '@/components/admin/panels/FeatureUsagePanel';

const mockUseQuery = vi.mocked(useQuery);

describe('FeatureUsagePanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<FeatureUsagePanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<FeatureUsagePanel />);
    expect(screen.getByText(/Loading feature usage/)).toBeTruthy();
  });

  it('shows empty state when no data', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<FeatureUsagePanel />);
    expect(screen.getByText('No feature usage data available')).toBeTruthy();
  });

  it('renders Feature column header when data is present', () => {
    mockUseQuery.mockReturnValue({
      data: {
        summary: [
          {
            feature: 'tasks',
            displayName: 'Tasks',
            pageViews: 500,
            uniqueUsers: 50,
            totalActions: 200,
            trend: 10,
            trendDirection: 'up' as const,
            deviceBreakdown: { mobile: 100, desktop: 300, tablet: 100 },
          },
        ],
        totals: {
          totalPageViews: 500,
          totalUniqueUsers: 50,
          totalActions: 200,
          deviceBreakdown: { mobile: 100, desktop: 300, tablet: 100 },
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<FeatureUsagePanel />);
    // "Feature" column header in table (uppercase in CSS, actual DOM text is "Feature")
    expect(screen.getByText('Feature')).toBeTruthy();
  });

  it('renders Features stat label', () => {
    mockUseQuery.mockReturnValue({
      data: {
        summary: [],
        totals: {
          totalPageViews: 0,
          totalUniqueUsers: 0,
          totalActions: 0,
          deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<FeatureUsagePanel />);
    expect(screen.getByText('Features')).toBeTruthy();
  });
});
