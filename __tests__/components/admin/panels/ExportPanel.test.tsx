// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() })),
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

vi.mock('@/lib/providers/query-client-provider', () => ({
  adminFetch: vi.fn(() =>
    Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['csv,data'], { type: 'text/csv' })),
      json: () => Promise.resolve({}),
    })
  ),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

import { ExportPanel } from '@/components/admin/panels/ExportPanel';

describe('ExportPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<ExportPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Data Export heading', () => {
    render(<ExportPanel />);
    expect(screen.getByText('Data Export')).toBeTruthy();
  });

  it('renders Export Data to CSV section', () => {
    render(<ExportPanel />);
    expect(screen.getByText('Export Data to CSV')).toBeTruthy();
  });

  it('renders Users export option', () => {
    render(<ExportPanel />);
    expect(screen.getByText('Users')).toBeTruthy();
  });

  it('renders Launch Notifications export option', () => {
    render(<ExportPanel />);
    expect(screen.getByText('Launch Notifications')).toBeTruthy();
  });

  it('renders Export CSV buttons', () => {
    render(<ExportPanel />);
    const exportButtons = screen.getAllByText('Export CSV');
    expect(exportButtons.length).toBeGreaterThan(0);
  });
});
