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

vi.mock('@/components/admin/panels/AnalyticsPanel', () => ({
  AnalyticsPanel: () => <div data-testid="analytics-panel">Analytics Panel</div>,
}));

vi.mock('@/components/admin/panels/FeatureUsagePanel', () => ({
  FeatureUsagePanel: () => <div data-testid="feature-usage-panel">Feature Usage Panel</div>,
}));

import { EngagementPanel } from '@/components/admin/panels/EngagementPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('EngagementPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<EngagementPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Traffic tab', () => {
    render(<EngagementPanel />);
    expect(screen.getByText('Traffic')).toBeTruthy();
  });

  it('renders Features tab', () => {
    render(<EngagementPanel />);
    expect(screen.getByText('Features')).toBeTruthy();
  });

  it('renders Sessions tab', () => {
    render(<EngagementPanel />);
    expect(screen.getByText('Sessions')).toBeTruthy();
  });

  it('renders Adoption tab', () => {
    render(<EngagementPanel />);
    expect(screen.getByText('Adoption')).toBeTruthy();
  });

  it('shows Traffic sub-panel by default (AnalyticsPanel)', () => {
    render(<EngagementPanel />);
    expect(screen.getByTestId('analytics-panel')).toBeTruthy();
  });

  it('switches to Features tab and shows FeatureUsagePanel', () => {
    render(<EngagementPanel />);
    fireEvent.click(screen.getByText('Features'));
    expect(screen.getByTestId('feature-usage-panel')).toBeTruthy();
  });

  it('shows loading state when adoption data is loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<EngagementPanel />);
    fireEvent.click(screen.getByText('Adoption'));
    expect(screen.getByText(/Loading adoption data/)).toBeTruthy();
  });
});
