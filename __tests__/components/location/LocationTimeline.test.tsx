// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LocationTimeline } from '@/components/location/LocationTimeline';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_: unknown, tag: string) => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag as string, props, children),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
}));

const mockFetchImpl = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: [] }),
});

vi.stubGlobal('fetch', mockFetchImpl);

describe('LocationTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchImpl.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  it('renders the Location Activity header', async () => {
    render(<LocationTimeline spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Location Activity')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('shows time range select combobox', async () => {
    render(<LocationTimeline spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.queryByRole('combobox')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('shows empty state when fetch returns empty arrays', async () => {
    render(<LocationTimeline spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('No location history yet')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('shows error state when fetch fails', async () => {
    mockFetchImpl.mockRejectedValueOnce(new Error('Network error'));
    render(<LocationTimeline spaceId="space-1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load location history')).toBeTruthy();
    }, { timeout: 5000 });
  });

  it('fetches with space_id in query params', async () => {
    render(<LocationTimeline spaceId="test-space" />);
    await waitFor(() => {
      const calls = mockFetchImpl.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(calls.some((url) => url.includes('test-space'))).toBe(true);
    }, { timeout: 5000 });
  });

  it('renders without crashing with different spaceId', () => {
    const { container } = render(<LocationTimeline spaceId="another-space" />);
    expect(container.firstChild).not.toBeNull();
  });
});
