'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { mealsService, Meal, Recipe } from '@/lib/services/meals-service';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = 'calendar' | 'list' | 'recipes';
export type CalendarViewMode = 'week' | '2weeks' | 'month';

export type MealsStats = {
  thisWeek: number;
  nextWeek: number;
  savedRecipes: number;
  shoppingItems: number;
};

export type PendingDeletion = {
  type: 'meal' | 'recipe';
  data: Meal | Recipe;
  timeoutId: NodeJS.Timeout;
};

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseMealsDataReturn {
  // Auth / access
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  spaceId: string | undefined;
  hasAccess: boolean;
  gateLoading: boolean;

  // Core data
  meals: Meal[];
  recipes: Recipe[];
  stats: MealsStats;
  loading: boolean;

  // React Query helpers
  queryClient: ReturnType<typeof useQueryClient>;
  refetchMeals: () => Promise<unknown>;
  refetchRecipes: () => Promise<unknown>;
  invalidateMeals: () => void;
  invalidateRecipes: () => void;

  // Pending deletions
  pendingDeletions: Map<string, PendingDeletion>;
  setPendingDeletions: React.Dispatch<React.SetStateAction<Map<string, PendingDeletion>>>;
  pendingDeletionsRef: React.MutableRefObject<Map<string, PendingDeletion>>;

  // View / filter state
  viewMode: ViewMode;
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
  calendarViewMode: CalendarViewMode;
  setCalendarViewMode: React.Dispatch<React.SetStateAction<CalendarViewMode>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;

  // Calendar state
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  currentWeek: Date;
  setCurrentWeek: React.Dispatch<React.SetStateAction<Date>>;

  // Search ref
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  // Computed / memoized
  filteredMeals: Meal[];
  filteredRecipes: Recipe[];
  calendarDays: Date[];
  mealsByDate: Map<string, Meal[]>;
  getMealsForDate: (date: Date) => Meal[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Loads and manages meal plan data with feature gate enforcement and date filtering */
export function useMealsData(showPastMeals: boolean): UseMealsDataReturn {
  // SECURITY: Check feature access FIRST, before loading any data
  const { hasAccess, isLoading: gateLoading } = useFeatureGate('mealPlanning');

  const { currentSpace, user } = useAuthWithSpaces();
  const queryClient = useQueryClient();
  const spaceId = currentSpace?.id;

  // React Query: fetch meals + stats
  const {
    data: mealsData,
    isLoading: mealsLoading,
    refetch: refetchMeals,
  } = useQuery({
    queryKey: QUERY_KEYS.meals.all(spaceId || ''),
    queryFn: async () => {
      const [meals, stats] = await Promise.all([
        mealsService.getMeals(spaceId!),
        mealsService.getMealStats(spaceId!),
      ]);
      return { meals, stats };
    },
    enabled: !!spaceId && !!user && !gateLoading && hasAccess,
    ...QUERY_OPTIONS.features,
  });

  // Memoize derived arrays to prevent new references on every render when mealsData is undefined
  const meals = useMemo(() => mealsData?.meals ?? [], [mealsData?.meals]);
  const stats = useMemo(() => mealsData?.stats ?? { thisWeek: 0, nextWeek: 0, savedRecipes: 0, shoppingItems: 0 }, [mealsData?.stats]);

  // React Query: fetch recipes
  const {
    data: recipes = [],
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: QUERY_KEYS.meals.recipes(spaceId || ''),
    queryFn: () => mealsService.getRecipes(spaceId!),
    enabled: !!spaceId && !gateLoading && hasAccess,
    ...QUERY_OPTIONS.features,
  });

  const loading = mealsLoading;

  // Invalidation helpers
  const invalidateMeals = useCallback(() => {
    if (!spaceId) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.all(spaceId) });
  }, [spaceId, queryClient]);

  const invalidateRecipes = useCallback(() => {
    if (!spaceId) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.meals.recipes(spaceId) });
  }, [spaceId, queryClient]);

  // Pending deletions state
  const [pendingDeletions, setPendingDeletions] = useState<Map<string, PendingDeletion>>(new Map());
  const pendingDeletionsRef = useRef(pendingDeletions);
  useEffect(() => { pendingDeletionsRef.current = pendingDeletions; }, [pendingDeletions]);

  // View / filter state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchTyping, setIsSearchTyping] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Search ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Memoized computed values ───────────────────────────────────────────────

  const filteredMeals = useMemo(() => {
    if (viewMode === 'recipes') return [];

    let filtered = meals;

    // List view: Filter out past meals unless showPastMeals is enabled
    if (viewMode === 'list' && !showPastMeals) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(m => {
        const mealDate = new Date(m.scheduled_date);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate >= today;
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [meals, searchQuery, viewMode, showPastMeals]);

  const filteredRecipes = useMemo(() => {
    if (viewMode !== 'recipes') return [];

    let filtered = recipes;
    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  }, [recipes, searchQuery, viewMode]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const mealsByDate = useMemo(() => {
    const grouped = new Map<string, Meal[]>();
    filteredMeals.forEach(meal => {
      const dateKey = format(new Date(meal.scheduled_date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(meal);
    });
    return grouped;
  }, [filteredMeals]);

  const getMealsForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return mealsByDate.get(dateKey) || [];
  }, [mealsByDate]);

  // ─── Real-time subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    if (!spaceId) return;

    const supabase = createClient();

    const mealsChannel = mealsService.subscribeToMeals(spaceId, () => {
      invalidateMeals();
    });

    const recipesChannel = mealsService.subscribeToRecipes(spaceId, () => {
      invalidateRecipes();
    });

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(recipesChannel);

      // Clear all pending deletion timeouts using ref
      pendingDeletionsRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    };
  }, [spaceId, invalidateMeals, invalidateRecipes]);

  return {
    // Auth / access
    currentSpace,
    user,
    spaceId,
    hasAccess,
    gateLoading,

    // Core data
    meals,
    recipes,
    stats,
    loading,

    // React Query helpers
    queryClient,
    refetchMeals: refetchMeals as () => Promise<unknown>,
    refetchRecipes: refetchRecipes as () => Promise<unknown>,
    invalidateMeals,
    invalidateRecipes,

    // Pending deletions
    pendingDeletions,
    setPendingDeletions,
    pendingDeletionsRef,

    // View / filter state
    viewMode,
    setViewMode,
    calendarViewMode,
    setCalendarViewMode,
    searchQuery,
    setSearchQuery,
    isSearchTyping,
    setIsSearchTyping,

    // Calendar state
    currentMonth,
    setCurrentMonth,
    currentWeek,
    setCurrentWeek,

    // Search ref
    searchInputRef,

    // Computed / memoized
    filteredMeals,
    filteredRecipes,
    calendarDays,
    mealsByDate,
    getMealsForDate,
  };
}
