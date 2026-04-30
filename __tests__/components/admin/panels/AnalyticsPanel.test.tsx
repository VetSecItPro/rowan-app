// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
    session: { access_token: 'test-token' },
    profile: null,
    spaces: [{ id: 'space-1', name: 'Test Space' }],
    currentSpace: { id: 'space-1', name: 'Test Space' },
    hasZeroSpaces: false,
    authLoading: false,
    profileLoading: false,
    spacesLoading: false,
    loading: false,
    isReady: true,
    authError: null,
    spacesError: null,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    switchSpace: vi.fn(),
    refreshSpaces: vi.fn(),
    createSpace: vi.fn(),
    deleteSpace: vi.fn(),
  })),
}));

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

import { AnalyticsPanel } from '@/components/admin/panels/AnalyticsPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('AnalyticsPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<AnalyticsPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders traffic overview section', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Traffic Overview')).toBeTruthy();
  });

  it('renders page views metric card', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Page Views')).toBeTruthy();
  });

  it('renders unique visitors metric card', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Unique Visitors')).toBeTruthy();
  });

  it('renders time range buttons', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('7 days')).toBeTruthy();
    expect(screen.getByText('30 days')).toBeTruthy();
    expect(screen.getByText('90 days')).toBeTruthy();
  });

  it('renders refresh button', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Refresh')).toBeTruthy();
  });

  it('renders traffic trends section', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Traffic Trends')).toBeTruthy();
  });

  it('renders device breakdown section', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Devices')).toBeTruthy();
  });

  it('renders traffic overview section', () => {
    render(<AnalyticsPanel />);
    expect(screen.getByText('Traffic Overview')).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
    render(<AnalyticsPanel />);
    expect(screen.getByText(/Loading analytics/)).toBeTruthy();
  });

  it('changes time range on button click', () => {
    render(<AnalyticsPanel />);
    const sevenDaysBtn = screen.getByText('7 days');
    fireEvent.click(sevenDaysBtn);
    expect(sevenDaysBtn.className).toContain('bg-cyan-900');
  });
});
