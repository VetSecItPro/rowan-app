// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn(), isFetching: false })),
}));

import { ConversionFunnelPanel } from '@/components/admin/panels/ConversionFunnelPanel';

const mockUseQuery = vi.mocked(useQuery);

const mockFunnelData = {
  steps: [
    { id: 'signups', label: 'Signed Up', count: 100, color: 'blue', description: 'Created an account' },
    { id: 'space', label: 'Created Space', count: 80, color: 'purple', description: 'Joined a household' },
    { id: 'action', label: 'First Action', count: 60, color: 'green', description: 'Used a feature' },
    { id: 'active', label: 'Weekly Active', count: 40, color: 'emerald', description: 'Active last 7 days' },
    { id: 'power', label: 'Power User', count: 10, color: 'amber', description: '5+ active days/week' },
  ],
  conversionRates: {
    signupToSpace: 80,
    spaceToAction: 75,
    actionToActive: 67,
    activeToPower: 25,
    overallConversion: 10,
  },
  topActivationFeatures: [
    { feature: 'tasks', users: 50 },
    { feature: 'meals', users: 30 },
  ],
  timeToMilestones: {
    medianSignupToSpace: 2,
    medianSpaceToAction: 0.5,
  },
  lastUpdated: '2024-01-01T00:00:00Z',
};

describe('ConversionFunnelPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<ConversionFunnelPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText(/Loading funnel data/)).toBeTruthy();
  });

  it('renders the funnel header', () => {
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('User Activation Funnel')).toBeTruthy();
  });

  it('renders funnel steps when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: mockFunnelData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('Signed Up')).toBeTruthy();
    expect(screen.getByText('Created Space')).toBeTruthy();
    expect(screen.getByText('Power User')).toBeTruthy();
  });

  it('renders conversion rate cards', () => {
    mockUseQuery.mockReturnValue({
      data: mockFunnelData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    // "Signup → Space" appears in both a conversion card label and a funnel step label
    // Use getAllByText to avoid strict single-element matching
    expect(screen.getAllByText('Signup → Space').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Space → Action').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active → Power').length).toBeGreaterThan(0);
  });

  it('displays overall conversion rate', () => {
    mockUseQuery.mockReturnValue({
      data: mockFunnelData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('10%')).toBeTruthy();
  });

  it('renders top activation features', () => {
    mockUseQuery.mockReturnValue({
      data: mockFunnelData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('Top Activation Features')).toBeTruthy();
    expect(screen.getByText('tasks')).toBeTruthy();
  });

  it('renders time-to-milestone section', () => {
    mockUseQuery.mockReturnValue({
      data: mockFunnelData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('Time to Milestone')).toBeTruthy();
  });

  it('shows no feature data message when topFeatures is empty', () => {
    mockUseQuery.mockReturnValue({
      data: { ...mockFunnelData, topActivationFeatures: [] },
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<ConversionFunnelPanel />);
    expect(screen.getByText('No feature data yet')).toBeTruthy();
  });
});
