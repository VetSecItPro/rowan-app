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

import { CustomerSuccessPanel } from '@/components/admin/panels/CustomerSuccessPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('CustomerSuccessPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<CustomerSuccessPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders AI Feedback tab', () => {
    render(<CustomerSuccessPanel />);
    expect(screen.getByText('AI Feedback')).toBeTruthy();
  });

  it('renders Engagement Health tab', () => {
    render(<CustomerSuccessPanel />);
    expect(screen.getByText('Engagement Health')).toBeTruthy();
  });

  it('renders Feature Requests tab', () => {
    render(<CustomerSuccessPanel />);
    expect(screen.getByText('Feature Requests')).toBeTruthy();
  });

  it('shows loading state in AI Feedback panel', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<CustomerSuccessPanel />);
    expect(screen.getByText(/Loading feedback data/)).toBeTruthy();
  });

  it('switches to Engagement Health tab on click', () => {
    render(<CustomerSuccessPanel />);
    fireEvent.click(screen.getByText('Engagement Health'));
    const tab = screen.getByText('Engagement Health');
    // Active tab uses rose border
    expect(tab.closest('button')?.className).toContain('border-rose-500');
  });

  it('AI Feedback tab is active by default', () => {
    render(<CustomerSuccessPanel />);
    const tab = screen.getByText('AI Feedback');
    // Active tab uses rose border
    expect(tab.closest('button')?.className).toContain('border-rose-500');
  });
});
