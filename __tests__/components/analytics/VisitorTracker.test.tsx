// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSendBeacon = vi.fn(() => true);
const mockFetch = vi.fn(() => Promise.resolve({ ok: true } as Response));

describe('VisitorTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'sendBeacon', {
      value: mockSendBeacon,
      writable: true,
    });
    Object.defineProperty(navigator, 'doNotTrack', {
      value: null,
      writable: true,
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders null (no visible output)', async () => {
    const VisitorTracker = (await import('@/components/analytics/VisitorTracker')).default;
    const { container } = render(<VisitorTracker />);
    expect(container.firstChild).toBeNull();
  });

  it('calls sendBeacon after debounce delay', async () => {
    const VisitorTracker = (await import('@/components/analytics/VisitorTracker')).default;
    render(<VisitorTracker />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockSendBeacon).toHaveBeenCalledWith(
      '/api/analytics/visit',
      expect.any(Blob)
    );
  });

  it('does not call sendBeacon when doNotTrack is set', async () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
    });
    const VisitorTracker = (await import('@/components/analytics/VisitorTracker')).default;
    render(<VisitorTracker />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it('sends path in payload', async () => {
    const { usePathname } = await import('next/navigation');
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    const VisitorTracker = (await import('@/components/analytics/VisitorTracker')).default;
    render(<VisitorTracker />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockSendBeacon).toHaveBeenCalled();
    const blob = mockSendBeacon.mock.calls[0][1] as Blob;
    const text = await blob.text();
    expect(JSON.parse(text)).toMatchObject({ path: '/dashboard' });
  });

  it('falls back to fetch when sendBeacon is unavailable', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
    });
    const VisitorTracker = (await import('@/components/analytics/VisitorTracker')).default;
    render(<VisitorTracker />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics/visit',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
