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

vi.mock('@/components/admin/panels/NotificationsPanel', () => ({
  NotificationsPanel: () => <div data-testid="notifications-panel">Notifications</div>,
}));

vi.mock('@/components/admin/panels/ConversionFunnelPanel', () => ({
  ConversionFunnelPanel: () => <div data-testid="funnel-panel">Funnel</div>,
}));

import { GrowthPanel } from '@/components/admin/panels/GrowthPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('GrowthPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<GrowthPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Traffic tab', () => {
    render(<GrowthPanel />);
    expect(screen.getByText('Traffic')).toBeTruthy();
  });

  it('renders Acquisition tab', () => {
    render(<GrowthPanel />);
    expect(screen.getByText('Acquisition')).toBeTruthy();
  });

  it('renders Funnel tab', () => {
    render(<GrowthPanel />);
    expect(screen.getByText('Funnel')).toBeTruthy();
  });

  it('renders Signups tab', () => {
    render(<GrowthPanel />);
    expect(screen.getByText('Signups')).toBeTruthy();
  });

  it('shows Traffic panel by default', () => {
    render(<GrowthPanel />);
    // Traffic tab is active by default
    const trafficTab = screen.getByText('Traffic');
    expect(trafficTab.closest('button')?.className).toContain('border-green-500');
  });

  it('shows Funnel panel when Funnel tab is clicked', () => {
    render(<GrowthPanel />);
    fireEvent.click(screen.getByText('Funnel'));
    expect(screen.getByTestId('funnel-panel')).toBeTruthy();
  });

  it('shows Signups panel when Signups tab is clicked', () => {
    render(<GrowthPanel />);
    fireEvent.click(screen.getByText('Signups'));
    expect(screen.getByTestId('notifications-panel')).toBeTruthy();
  });
});
