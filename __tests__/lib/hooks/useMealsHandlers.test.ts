/**
 * Unit tests for lib/hooks/useMealsHandlers.ts
 *
 * Tests handler function existence and navigation helpers.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMealsHandlers } from '@/lib/hooks/useMealsHandlers';
import type { UseMealsHandlersDeps } from '@/lib/hooks/useMealsHandlers';

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    createMeal: vi.fn().mockResolvedValue({ id: 'meal-1' }),
    updateMeal: vi.fn().mockResolvedValue(undefined),
    deleteMeal: vi.fn().mockResolvedValue(undefined),
    createRecipe: vi.fn().mockResolvedValue({ id: 'recipe-1' }),
    updateRecipe: vi.fn().mockResolvedValue(undefined),
    deleteRecipe: vi.fn().mockResolvedValue(undefined),
  },
  Meal: {},
  Recipe: {},
  CreateMealInput: {},
  CreateRecipeInput: {},
}));

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createList: vi.fn().mockResolvedValue({ id: 'list-1' }),
  },
}));

vi.mock('@/lib/react-query/query-client', () => ({
  QUERY_KEYS: {
    meals: { all: () => ['meals'] },
    recipes: { all: () => ['recipes'] },
  },
}));

vi.mock('@/lib/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
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

function buildDeps(overrides: Partial<UseMealsHandlersDeps> = {}): UseMealsHandlersDeps {
  const queryClient = new QueryClient();
  return {
    spaceId: 'space-1',
    meals: [],
    recipes: [],
    stats: { total: 0, thisWeek: 0, planned: 0, totalRecipes: 0 },
    queryClient,
    refetchMeals: vi.fn().mockResolvedValue(undefined),
    refetchRecipes: vi.fn().mockResolvedValue(undefined),
    invalidateMeals: vi.fn(),
    invalidateRecipes: vi.fn(),
    setPendingDeletions: vi.fn(),
    setViewMode: vi.fn(),
    setCalendarViewMode: vi.fn(),
    setSearchQuery: vi.fn(),
    setIsSearchTyping: vi.fn(),
    setCurrentMonth: vi.fn(),
    setCurrentWeek: vi.fn(),
    searchInputRef: { current: null },
    editingMeal: null,
    setEditingMeal: vi.fn(),
    editingRecipe: null,
    setEditingRecipe: vi.fn(),
    setIsModalOpen: vi.fn(),
    setIsRecipeModalOpen: vi.fn(),
    setRecipeModalInitialTab: vi.fn(),
    isIngredientReviewOpen: false,
    setIsIngredientReviewOpen: vi.fn(),
    pendingMealData: null,
    setPendingMealData: vi.fn(),
    selectedRecipeForReview: null,
    setSelectedRecipeForReview: vi.fn(),
    setIsGenerateListOpen: vi.fn(),
    setShowPastMeals: vi.fn(),
    handleOpenMealModal: vi.fn(),
    handleCloseMealModal: vi.fn(),
    handleOpenRecipeModal: vi.fn(),
    handleCloseRecipeModal: vi.fn(),
    handleEscapeClose: vi.fn(),
    ...overrides,
  };
}

describe('useMealsHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return all expected handler functions', () => {
    const { result } = renderHook(() => useMealsHandlers(buildDeps()), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.handleCreateMeal).toBe('function');
    expect(typeof result.current.handleDeleteMeal).toBe('function');
    expect(typeof result.current.handleCreateRecipe).toBe('function');
    expect(typeof result.current.handleDeleteRecipe).toBe('function');
    expect(typeof result.current.handlePreviousMonth).toBe('function');
    expect(typeof result.current.handleNextMonth).toBe('function');
  });

  it('handlePreviousMonth should call setCurrentMonth with an updater', () => {
    const setCurrentMonth = vi.fn();
    const { result } = renderHook(
      () => useMealsHandlers(buildDeps({ setCurrentMonth })), {
        wrapper: createWrapper(),
      }
    );

    act(() => result.current.handlePreviousMonth());

    expect(setCurrentMonth).toHaveBeenCalledTimes(1);
  });

  it('handleNextMonth should call setCurrentMonth with an updater', () => {
    const setCurrentMonth = vi.fn();
    const { result } = renderHook(
      () => useMealsHandlers(buildDeps({ setCurrentMonth })), {
        wrapper: createWrapper(),
      }
    );

    act(() => result.current.handleNextMonth());

    expect(setCurrentMonth).toHaveBeenCalledTimes(1);
  });
});
