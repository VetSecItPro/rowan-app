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

vi.mock('@/lib/constants/benchmarks', () => ({
  getBenchmarkLevel: vi.fn(() => 'good'),
  getBenchmarkColor: vi.fn(() => 'text-green-400'),
  getBenchmarkBgColor: vi.fn(() => 'bg-green-900/20'),
}));

vi.mock('@/components/admin/panels/SubscriptionsPanel', () => ({
  SubscriptionsPanel: () => <div data-testid="subscriptions-panel">SubscriptionsContent</div>,
}));

import { RevenuePanel } from '@/components/admin/panels/RevenuePanel';

const mockUseQuery = vi.mocked(useQuery);

describe('RevenuePanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<RevenuePanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Subscriptions tab button', () => {
    render(<RevenuePanel />);
    // "Subscriptions" appears as a tab button in the navigation
    // Use getAllByText since it may appear elsewhere too
    expect(screen.getAllByText('Subscriptions').length).toBeGreaterThan(0);
  });

  it('renders MRR Trends tab', () => {
    render(<RevenuePanel />);
    expect(screen.getByText('MRR Trends')).toBeTruthy();
  });

  it('renders Conversions tab', () => {
    render(<RevenuePanel />);
    expect(screen.getByText('Conversions')).toBeTruthy();
  });

  it('renders MRR Waterfall tab', () => {
    render(<RevenuePanel />);
    expect(screen.getByText('MRR Waterfall')).toBeTruthy();
  });

  it('renders Cohorts tab', () => {
    render(<RevenuePanel />);
    expect(screen.getByText('Cohorts')).toBeTruthy();
  });

  it('shows SubscriptionsPanel by default', () => {
    render(<RevenuePanel />);
    expect(screen.getByTestId('subscriptions-panel')).toBeTruthy();
  });

  it('shows loading spinner in MRR panel on tab switch', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<RevenuePanel />);
    fireEvent.click(screen.getByText('MRR Trends'));
    // MrrPanel shows a spinner div when loading, not text
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('switches tabs on click', () => {
    render(<RevenuePanel />);
    fireEvent.click(screen.getByText('MRR Trends'));
    const tab = screen.getByText('MRR Trends');
    // RevenuePanel uses orange-500 for active tab
    expect(tab.closest('button')?.className).toContain('border-orange-500');
  });
});
