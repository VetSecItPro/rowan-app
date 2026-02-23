// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Cell: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

import { AIUsagePanel } from '@/components/admin/panels/AIUsagePanel';

const mockUseQuery = vi.mocked(useQuery);

const safeEmptyResult = { data: undefined, isLoading: false } as ReturnType<typeof useQuery>;

describe('AIUsagePanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(safeEmptyResult);
  });

  it('renders without crashing', () => {
    const { container } = render(<AIUsagePanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders sub-tab navigation', () => {
    render(<AIUsagePanel />);
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Unit Economics')).toBeTruthy();
  });

  it('renders Overview tab content by default', () => {
    render(<AIUsagePanel />);
    // "Today" appears as a range button AND as metric subtitle
    const todayItems = screen.getAllByText('Today');
    expect(todayItems.length).toBeGreaterThan(0);
    const sevenDayItems = screen.getAllByText('7 Days');
    expect(sevenDayItems.length).toBeGreaterThan(0);
  });

  it('switches to Unit Economics tab on click', () => {
    render(<AIUsagePanel />);
    fireEvent.click(screen.getByText('Unit Economics'));
    expect(screen.getByText('Cost per AI User')).toBeTruthy();
  });

  it('switches back to Overview on Overview tab click', () => {
    render(<AIUsagePanel />);
    fireEvent.click(screen.getByText('Unit Economics'));
    fireEvent.click(screen.getByText('Overview'));
    const todayItems = screen.getAllByText('Today');
    expect(todayItems.length).toBeGreaterThan(0);
  });

  it('shows loading state when data is being fetched', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useQuery>);
    render(<AIUsagePanel />);
    expect(screen.getByText(/Loading AI usage data/)).toBeTruthy();
  });

  it('shows KPI cards when data is loaded', () => {
    // AIUsagePanel's OverviewPanel makes 3 useQuery calls:
    // 1. AI usage data (with totals)
    // 2. Realtime data
    // 3. Rate limits
    // We use mockReturnValueOnce for the first call (usage data),
    // and safe undefined for subsequent calls (realtime, rate limits)
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          range: 'today',
          totals: { input_tokens: 1000, output_tokens: 500, cost_usd: 0.05, conversations: 10, tool_calls: 5, voice_seconds: 0 },
          active_users_today: 3,
          cost_by_feature: [],
          cost_by_tier: [],
          daily_trend: [],
          top_users: [],
        },
        isLoading: false,
      } as ReturnType<typeof useQuery>)
      // Realtime data — undefined is safe (rateLimits check is guarded)
      .mockReturnValueOnce(safeEmptyResult)
      // Rate limits — undefined avoids the RateLimitGauge crash
      .mockReturnValue(safeEmptyResult);

    render(<AIUsagePanel />);
    expect(screen.getByText("Today's Cost")).toBeTruthy();
    expect(screen.getByText('Active AI Users')).toBeTruthy();
  });
});
