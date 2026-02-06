'use client';

import { useState, useMemo } from 'react';

const DEFAULT_PAGE_SIZE = 20;

export function useLoadMore<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  const loadMore = () => setVisibleCount(prev => prev + pageSize);
  const reset = () => setVisibleCount(pageSize);

  return { visibleItems, hasMore, remaining, loadMore, reset };
}
