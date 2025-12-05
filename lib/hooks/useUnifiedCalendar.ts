'use client';

// useUnifiedCalendar Hook
// Phase 9: Custom hook for fetching and managing unified calendar items

import { useState, useEffect, useCallback, useMemo } from 'react';
import { unifiedCalendarService } from '@/lib/services/calendar/unified-calendar-service';
import { unifiedCalendarMapper } from '@/lib/services/calendar/unified-calendar-mapper';
import {
  DEFAULT_UNIFIED_FILTERS,
  type UnifiedCalendarItem,
  type UnifiedCalendarFilters,
  type UnifiedItemType,
} from '@/lib/types/unified-calendar-item';

interface UseUnifiedCalendarOptions {
  spaceId: string;
  startDate: Date;
  endDate: Date;
  initialFilters?: UnifiedCalendarFilters;
  includeCompleted?: boolean;
  autoFetch?: boolean;
}

interface UseUnifiedCalendarReturn {
  /** All unified calendar items */
  items: UnifiedCalendarItem[];

  /** Items grouped by date */
  itemsByDate: Map<string, UnifiedCalendarItem[]>;

  /** Count of items by type */
  counts: Record<UnifiedItemType, number>;

  /** Loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;

  /** Current filter state */
  filters: UnifiedCalendarFilters;

  /** Update filters */
  setFilters: (filters: UnifiedCalendarFilters) => void;

  /** Refresh data */
  refresh: () => Promise<void>;
}

/**
 * Custom hook for unified calendar data
 *
 * @param options - Configuration options
 * @returns Unified calendar state and controls
 *
 * @example
 * ```tsx
 * const { items, itemsByDate, filters, setFilters, isLoading } = useUnifiedCalendar({
 *   spaceId: currentSpace.id,
 *   startDate: new Date(),
 *   endDate: addDays(new Date(), 30),
 * });
 * ```
 */
export function useUnifiedCalendar({
  spaceId,
  startDate,
  endDate,
  initialFilters = DEFAULT_UNIFIED_FILTERS,
  includeCompleted = false,
  autoFetch = true,
}: UseUnifiedCalendarOptions): UseUnifiedCalendarReturn {
  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  const [counts, setCounts] = useState<Record<UnifiedItemType, number>>({
    event: 0,
    task: 0,
    meal: 0,
    reminder: 0,
    goal: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UnifiedCalendarFilters>(initialFilters);

  // Memoize date range keys to avoid unnecessary fetches
  const dateRangeKey = useMemo(() => {
    return `${startDate.toISOString()}-${endDate.toISOString()}`;
  }, [startDate, endDate]);

  // Fetch function
  const fetchItems = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedCalendarService.getUnifiedItems({
        spaceId,
        startDate,
        endDate,
        filters,
        includeCompleted,
      });

      setItems(result.items);
      setCounts(result.counts);

      if (result.errors && result.errors.length > 0) {
        setError(result.errors.join(', '));
      }
    } catch (err) {
      console.error('[useUnifiedCalendar] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar items');
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, startDate, endDate, filters, includeCompleted]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchItems();
    }
  }, [fetchItems, autoFetch]);

  // Memoized items grouped by date
  const itemsByDate = useMemo(() => {
    return unifiedCalendarMapper.groupByDate(items);
  }, [items]);

  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  return {
    items,
    itemsByDate,
    counts,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
  };
}

/**
 * Hook for getting items for a single date
 */
export function useUnifiedCalendarDate(
  spaceId: string,
  date: Date,
  filters?: UnifiedCalendarFilters
) {
  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const dateKey = useMemo(() => date.toISOString().split('T')[0], [date]);

  useEffect(() => {
    if (!spaceId) return;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const result = await unifiedCalendarService.getItemsForDate(spaceId, date, filters);
        setItems(result);
      } catch (err) {
        console.error('[useUnifiedCalendarDate] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [spaceId, dateKey, filters]);

  return { items, isLoading };
}

/**
 * Hook for getting upcoming items
 */
export function useUpcomingItems(
  spaceId: string,
  daysAhead: number = 7,
  filters?: UnifiedCalendarFilters
) {
  const [items, setItems] = useState<UnifiedCalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!spaceId) return;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const result = await unifiedCalendarService.getUpcomingItems(spaceId, daysAhead, filters);
        setItems(result);
      } catch (err) {
        console.error('[useUpcomingItems] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [spaceId, daysAhead, filters]);

  return { items, isLoading };
}

export default useUnifiedCalendar;
