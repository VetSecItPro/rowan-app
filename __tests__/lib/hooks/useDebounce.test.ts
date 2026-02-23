/**
 * Unit tests for lib/hooks/useDebounce.ts
 *
 * Tests debounce functionality:
 * - useDebounce: value debouncing
 * - useDebouncedCallback: callback debouncing
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 300 });

    // Value should still be initial (not debounced yet)
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Rapid updates
    rerender({ value: 'update1' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update3' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Still initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Complete the debounce
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should show last update
    expect(result.current).toBe('update3');
  });

  it('should use default delay of 300ms', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle custom delays', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', 300));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('arg1');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith('arg1');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on rapid calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('call1');
      vi.advanceTimersByTime(100);
      result.current('call2');
      vi.advanceTimersByTime(100);
      result.current('call3');
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Only last call should execute
    expect(callback).toHaveBeenCalledWith('call3');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should use default delay of 300ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => {
      result.current();
      vi.advanceTimersByTime(299);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback((a: number, b: string, c: boolean) => callback(a, b, c), 300)
    );

    act(() => {
      result.current(1, 'test', true);
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith(1, 'test', true);
  });

  it('should update callback ref when callback changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }) => useDebouncedCallback(cb, 300),
      { initialProps: { cb: callback1 } }
    );

    act(() => {
      result.current('arg');
    });

    // Change callback before timer fires
    rerender({ cb: callback2 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should call the new callback
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('arg');
  });

  it('should cleanup timer on unmount', () => {
    const callback = vi.fn();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current('test');
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});
