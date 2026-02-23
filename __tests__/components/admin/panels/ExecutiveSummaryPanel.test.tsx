// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(),
}));

import { ExecutiveSummaryPanel } from '@/components/admin/panels/ExecutiveSummaryPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('ExecutiveSummaryPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<ExecutiveSummaryPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('shows loading state when fetching tokens', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useQuery>);
    render(<ExecutiveSummaryPanel />);
    expect(screen.getByText(/Loading tokens/)).toBeTruthy();
  });

  it('renders Executive Summary Links heading', () => {
    // Provide empty array so component renders non-loading state
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useQuery>);
    render(<ExecutiveSummaryPanel />);
    expect(screen.getByText('Executive Summary Links')).toBeTruthy();
  });

  it('renders with empty tokens list', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useQuery>);
    const { container } = render(<ExecutiveSummaryPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders tokens list when data is available', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: 'tok-1',
          token: 'abc123',
          label: 'Q1 2024 Investor',
          expires_at: '2024-12-31T00:00:00Z',
          created_by: 'admin@example.com',
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useQuery>);
    render(<ExecutiveSummaryPanel />);
    expect(screen.getByText('Q1 2024 Investor')).toBeTruthy();
  });
});
