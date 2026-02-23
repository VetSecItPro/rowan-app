// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn(), isFetching: false })),
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ health: null, performance: [] }),
  } as unknown as Response)
);

import { HealthPanel } from '@/components/admin/panels/HealthPanel';

const mockUseQuery = vi.mocked(useQuery);

// Match the HealthData interface in the component:
// overall, metrics (HealthMetric[]), uptime, version, environment, responseTime
const mockHealthData = {
  health: {
    overall: 'healthy' as const,
    metrics: [
      {
        name: 'Database',
        status: 'healthy' as const,
        value: '5ms',
        description: 'Connection OK',
        lastChecked: new Date().toISOString(),
      },
      {
        name: 'Auth',
        status: 'healthy' as const,
        value: '3ms',
        description: 'Auth service OK',
        lastChecked: new Date().toISOString(),
      },
    ],
    uptime: '99.9%',
    version: '1.0.0',
    environment: 'production',
    responseTime: '50ms',
  },
  performance: [
    {
      endpoint: '/api/tasks',
      avgResponseTime: 150,
      errorRate: 0.1,
      requestCount: 1000,
      status: 'healthy' as const,
    },
  ],
};

describe('HealthPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<HealthPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<HealthPanel />);
    expect(screen.getByText(/Checking system health/)).toBeTruthy();
  });

  it('shows unable to fetch message when no health data', () => {
    mockUseQuery.mockReturnValue({
      data: { health: null, performance: [] },
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<HealthPanel />);
    expect(screen.getByText('Unable to fetch health data')).toBeTruthy();
  });

  it('renders system status when health data is available', () => {
    mockUseQuery.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<HealthPanel />);
    // Component renders "System Healthy" (capital H from charAt(0).toUpperCase())
    expect(screen.getByText(/System Healthy/)).toBeTruthy();
  });

  it('renders service check names when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: mockHealthData,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<HealthPanel />);
    expect(screen.getByText('Database')).toBeTruthy();
    expect(screen.getByText('Auth')).toBeTruthy();
  });
});
