/**
 * Unit tests for lib/hooks/useMealsData.ts
 *
 * Tests initial state, view mode/filter state, and React Query integration.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMealsData } from '@/lib/hooks/useMealsData';

vi.mock('@/lib/hooks/useAuthWithSpaces', () => ({
  useAuthWithSpaces: vi.fn(() => ({
    currentSpace: { id: 'space-1', name: 'Test Space' },
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

vi.mock('@/lib/hooks/useFeatureGate', () => ({
  useFeatureGate: vi.fn(() => ({
    hasAccess: true,
    isLoading: false,
  })),
}));

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    getMeals: vi.fn().mockResolvedValue([]),
    getMealStats: vi.fn().mockResolvedValue({ thisWeek: 0, nextWeek: 0, savedRecipes: 0, shoppingItems: 0 }),
    getRecipes: vi.fn().mockResolvedValue([]),
    subscribeToMeals: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    subscribeToRecipes: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  },
  Meal: {},
  Recipe: {},
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_KEYS: {
    meals: {
      all: (id: string) => ['meals', 'all', id],
      recipes: (id: string) => ['meals', 'recipes', id],
    },
  },
  QUERY_OPTIONS: {
    features: { staleTime: 30000 },
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return { ...actual };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useMealsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state with empty data', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.meals).toEqual([]);
    expect(result.current.recipes).toEqual([]);
    expect(result.current.viewMode).toBe('calendar');
    expect(result.current.searchQuery).toBe('');
  });

  it('setViewMode should update view mode', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setViewMode('list'));

    expect(result.current.viewMode).toBe('list');
  });

  it('setSearchQuery should update search state', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchQuery('pasta'));

    expect(result.current.searchQuery).toBe('pasta');
  });

  it('should expose refetchMeals and invalidateMeals functions', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refetchMeals).toBe('function');
    expect(typeof result.current.invalidateMeals).toBe('function');
  });

  it('should expose filteredMeals as array', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.filteredMeals)).toBe(true);
    expect(Array.isArray(result.current.filteredRecipes)).toBe(true);
  });

  it('should expose calendarDays as array', async () => {
    const { result } = renderHook(() => useMealsData(false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.calendarDays)).toBe(true);
  });
});
