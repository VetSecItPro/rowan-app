/**
 * Unit tests for lib/hooks/usePrefetch.ts
 *
 * Tests data and route prefetching:
 * - Hover prefetch
 * - Query prefetching
 * - Route prefetching
 * - Delay handling
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock next router
const mockPrefetch = vi.fn();
const mockRouter = {
  prefetch: mockPrefetch,
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Import after mocks
import { usePrefetchOnHover } from '@/lib/hooks/usePrefetch';

describe('usePrefetchOnHover', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should prefetch on mouse enter after delay', async () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/tasks',
          delay: 100,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    expect(mockPrefetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockPrefetch).toHaveBeenCalledWith('/tasks');
  });

  it('should cancel prefetch on mouse leave', () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/tasks',
          delay: 100,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onMouseEnter();
      result.current.onMouseLeave();
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('should prefetch immediately on focus', () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/calendar',
        }),
      { wrapper }
    );

    act(() => {
      result.current.onFocus();
    });

    expect(mockPrefetch).toHaveBeenCalledWith('/calendar');
  });

  it('should only prefetch once', () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/tasks',
          delay: 0,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
  });

  it('should handle custom delay', () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/goals',
          delay: 500,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(mockPrefetch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(mockPrefetch).toHaveBeenCalled();
  });

  it('should skip route prefetch when disabled', () => {
    const { result } = renderHook(
      () =>
        usePrefetchOnHover({
          route: '/tasks',
          prefetchRoute: false,
          delay: 0,
        }),
      { wrapper }
    );

    act(() => {
      result.current.onMouseEnter();
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});
