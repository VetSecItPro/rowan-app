/**
 * Unit tests for hooks/useLoadMore.ts
 *
 * Tests paginated loading: visibleItems, hasMore, remaining, loadMore, reset.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadMore } from '@/hooks/useLoadMore';

describe('useLoadMore', () => {
  it('should return first page of items initially', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() => useLoadMore(items, 20));

    expect(result.current.visibleItems).toHaveLength(20);
    expect(result.current.visibleItems[0]).toBe(0);
    expect(result.current.visibleItems[19]).toBe(19);
  });

  it('should report hasMore true when items exceed visible count', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() => useLoadMore(items, 20));

    expect(result.current.hasMore).toBe(true);
    expect(result.current.remaining).toBe(30);
  });

  it('should report hasMore false when all items are visible', () => {
    const items = [1, 2, 3];
    const { result } = renderHook(() => useLoadMore(items, 20));

    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(-17);
  });

  it('loadMore should increase visible items by pageSize', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() => useLoadMore(items, 20));

    act(() => result.current.loadMore());

    expect(result.current.visibleItems).toHaveLength(40);
  });

  it('reset should return visible count to pageSize', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() => useLoadMore(items, 20));

    act(() => result.current.loadMore());
    expect(result.current.visibleItems).toHaveLength(40);

    act(() => result.current.reset());
    expect(result.current.visibleItems).toHaveLength(20);
  });

  it('should use DEFAULT_PAGE_SIZE of 20 when not specified', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() => useLoadMore(items));

    expect(result.current.visibleItems).toHaveLength(20);
  });

  it('should handle empty items array', () => {
    const { result } = renderHook(() => useLoadMore([], 20));

    expect(result.current.visibleItems).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.remaining).toBe(-20);
  });
});
