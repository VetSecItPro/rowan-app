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

vi.mock('@/components/admin/panels/HealthPanel', () => ({
  HealthPanel: () => <div data-testid="health-panel">Health Panel</div>,
}));

vi.mock('@/components/admin/panels/ExportPanel', () => ({
  ExportPanel: () => <div data-testid="export-panel">Export Panel</div>,
}));

import { SystemPanel } from '@/components/admin/panels/SystemPanel';

const mockUseQuery = vi.mocked(useQuery);

describe('SystemPanel', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('renders without crashing', () => {
    const { container } = render(<SystemPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Health tab', () => {
    render(<SystemPanel />);
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('renders Export tab', () => {
    render(<SystemPanel />);
    expect(screen.getByText('Export')).toBeTruthy();
  });

  it('renders Performance tab', () => {
    render(<SystemPanel />);
    expect(screen.getByText('Performance')).toBeTruthy();
  });

  it('renders Database tab', () => {
    render(<SystemPanel />);
    expect(screen.getByText('Database')).toBeTruthy();
  });

  it('renders Goals tab', () => {
    render(<SystemPanel />);
    expect(screen.getByText('Goals')).toBeTruthy();
  });

  it('shows Health panel by default', () => {
    render(<SystemPanel />);
    expect(screen.getByTestId('health-panel')).toBeTruthy();
  });

  it('shows Export panel when Export tab is clicked', () => {
    render(<SystemPanel />);
    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByTestId('export-panel')).toBeTruthy();
  });

  it('shows Performance loading state on Performance tab click', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      isFetching: false,
    } as ReturnType<typeof useQuery>);
    render(<SystemPanel />);
    fireEvent.click(screen.getByText('Performance'));
    expect(screen.getByText(/Loading/)).toBeTruthy();
  });

  it('switches active tab styling', () => {
    render(<SystemPanel />);
    fireEvent.click(screen.getByText('Goals'));
    const tab = screen.getByText('Goals');
    // SystemPanel uses gray-300 for active tab
    expect(tab.closest('button')?.className).toContain('border-gray-300');
  });
});
