'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { shoppingService, ShoppingList } from '@/lib/services/shopping-service';
import { QUERY_KEYS, QUERY_OPTIONS } from '@/lib/react-query/query-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusFilter = 'all' | 'active' | 'completed';
export type TimeFilter = 'all' | 'week';

export interface ShoppingStats {
  totalLists: number;
  activeLists: number;
  itemsThisWeek: number;
  completedLists: number;
}

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseShoppingDataReturn {
  // Auth / context
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];
  spaceId: string | undefined;
  queryClient: ReturnType<typeof useQueryClient>;

  // Core data
  lists: ShoppingList[];
  stats: ShoppingStats;
  loading: boolean;

  // Data refresh
  refetchLists: () => Promise<unknown>;
  invalidateShopping: () => void;

  // Search state
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  debouncedSearchQuery: string;
  isSearchTyping: boolean;
  setIsSearchTyping: React.Dispatch<React.SetStateAction<boolean>>;

  // Filter state
  statusFilter: StatusFilter;
  setStatusFilter: React.Dispatch<React.SetStateAction<StatusFilter>>;
  timeFilter: TimeFilter;
  setTimeFilter: React.Dispatch<React.SetStateAction<TimeFilter>>;

  // Computed / memoized
  filteredLists: ShoppingList[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Loads and manages shopping lists and items with real-time sync and caching */
export function useShoppingData(): UseShoppingDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();
  const queryClient = useQueryClient();
  const spaceId = currentSpace?.id;

  // ─── React Query: fetch shopping lists ─────────────────────────────────────

  const {
    data: lists = [],
    isLoading: listsLoading,
    refetch: refetchLists,
  } = useQuery({
    queryKey: QUERY_KEYS.shopping.lists(spaceId || ''),
    queryFn: () => shoppingService.getLists(spaceId!),
    enabled: !!spaceId && !!user,
    ...QUERY_OPTIONS.features,
  });

  // ─── React Query: fetch shopping stats ─────────────────────────────────────

  const {
    data: stats = { totalLists: 0, activeLists: 0, itemsThisWeek: 0, completedLists: 0 },
  } = useQuery({
    queryKey: QUERY_KEYS.shopping.stats(spaceId || ''),
    queryFn: () => shoppingService.getShoppingStats(spaceId!),
    enabled: !!spaceId && !!user,
    ...QUERY_OPTIONS.features,
  });

  const loading = listsLoading;

  // ─── Search state ──────────────────────────────────────────────────────────

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isSearchTyping, setIsSearchTyping] = useState(false);

  // ─── Filter state ──────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // ─── Invalidate both lists and stats caches ────────────────────────────────

  const invalidateShopping = useCallback(() => {
    if (!spaceId) return;
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopping.lists(spaceId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopping.stats(spaceId) });
  }, [spaceId, queryClient]);

  // ─── Real-time subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!spaceId) return;

    const channel = shoppingService.subscribeToLists(spaceId, () => {
      invalidateShopping();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId, invalidateShopping]);

  // ─── Memoized filtered lists ───────────────────────────────────────────────

  const filteredLists = useMemo(() => {
    let filtered = lists;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    // Filter by time (this week)
    if (timeFilter === 'week') {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      filtered = filtered.filter(l => {
        const createdDate = new Date(l.created_at);
        return createdDate >= startOfWeek && createdDate <= endOfWeek;
      });
    }

    // Filter by search (uses debounced value for performance)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [lists, debouncedSearchQuery, statusFilter, timeFilter]);

  return {
    // Auth / context
    currentSpace,
    user,
    spaceId,
    queryClient,

    // Core data
    lists,
    stats,
    loading,

    // Data refresh
    refetchLists,
    invalidateShopping,

    // Search state
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearchTyping,
    setIsSearchTyping,

    // Filter state
    statusFilter,
    setStatusFilter,
    timeFilter,
    setTimeFilter,

    // Computed / memoized
    filteredLists,
  };
}
