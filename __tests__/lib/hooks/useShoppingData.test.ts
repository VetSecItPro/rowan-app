/**
 * Unit tests for lib/hooks/useShoppingData.ts
 *
 * Tests initial state, search/filter state management, and data loading.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useShoppingData } from '@/lib/hooks/useShoppingData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    getLists: vi.fn().mockResolvedValue([]),
    subscribeToLists: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    getStats: vi.fn().mockResolvedValue({
      totalLists: 0,
      activeLists: 0,
      itemsThisWeek: 0,
      completedLists: 0,
    }),
  },
  ShoppingList: {},
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_KEYS: {
    shopping: {
      lists: (id: string) => ['shopping', 'lists', id],
      stats: (id: string) => ['shopping', 'stats', id],
    },
  },
  QUERY_OPTIONS: {
    features: { staleTime: 30000 },
  },
}));

vi.mock('@/lib/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useShoppingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state with empty lists', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.lists).toEqual([]);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('active');
    expect(result.current.timeFilter).toBe('all');
  });

  it('should expose setSearchQuery and update search state', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('milk'));

    expect(result.current.searchQuery).toBe('milk');
  });

  it('should expose setStatusFilter to update status filter', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatusFilter('active'));

    expect(result.current.statusFilter).toBe('active');
  });

  it('should expose setTimeFilter to update time filter', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setTimeFilter('week'));

    expect(result.current.timeFilter).toBe('week');
  });

  it('should expose refetchLists and invalidateShopping functions', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refetchLists).toBe('function');
    expect(typeof result.current.invalidateShopping).toBe('function');
  });

  it('should expose filteredLists as a computed value', async () => {
    const { result } = renderHook(() => useShoppingData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.filteredLists)).toBe(true);
  });
});
