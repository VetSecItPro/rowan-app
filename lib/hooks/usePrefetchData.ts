/**
 * Data Prefetch Hook
 *
 * Use this hook on feature pages to automatically prefetch data for
 * other features, enabling instant navigation between pages.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  prefetchCriticalData,
  prefetchFeatureData,
  ROUTE_TO_FEATURE_MAP,
} from '@/lib/services/prefetch-service';
import { useSpaces } from '@/lib/contexts/spaces-context';

interface PrefetchDataOptions {
  /** Skip initial prefetch on mount */
  skipInitial?: boolean;
  /** Features to exclude from prefetching */
  excludeFeatures?: string[];
  /** Delay before prefetching (ms) */
  delay?: number;
}

/**
 * Hook to prefetch all feature data on page load
 * Use this on the dashboard or any main feature page
 */
export function usePrefetchAllData(options: PrefetchDataOptions = {}) {
  const { skipInitial = false, delay = 500 } = options;
  const queryClient = useQueryClient();
  const { currentSpace } = useSpaces();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (skipInitial || hasPrefetched.current || !currentSpace?.id) return;

    const timer = setTimeout(() => {
      hasPrefetched.current = true;
      prefetchCriticalData(queryClient, currentSpace.id).catch(console.error);
    }, delay);

    return () => clearTimeout(timer);
  }, [queryClient, currentSpace?.id, skipInitial, delay]);

  // Return function to manually trigger prefetch
  const prefetchAll = useCallback(() => {
    if (!currentSpace?.id) return;
    prefetchCriticalData(queryClient, currentSpace.id).catch(console.error);
  }, [queryClient, currentSpace?.id]);

  return { prefetchAll };
}

/**
 * Hook to prefetch a specific feature's data
 * Use this when hovering over navigation items
 */
export function usePrefetchFeature() {
  const queryClient = useQueryClient();
  const { currentSpace } = useSpaces();
  const prefetchedFeatures = useRef<Set<string>>(new Set());

  const prefetch = useCallback(
    (route: string) => {
      if (!currentSpace?.id) return;

      // Check if already prefetched
      const cacheKey = `${route}-${currentSpace.id}`;
      if (prefetchedFeatures.current.has(cacheKey)) return;

      const feature = ROUTE_TO_FEATURE_MAP[route];
      if (feature) {
        prefetchedFeatures.current.add(cacheKey);
        prefetchFeatureData(queryClient, feature, currentSpace.id).catch(console.error);
      }
    },
    [queryClient, currentSpace?.id]
  );

  return { prefetchFeature: prefetch };
}

/**
 * Hook that returns prefetch handlers for navigation items
 * Combines route prefetching with data prefetching
 */
export function useNavigationPrefetch() {
  const queryClient = useQueryClient();
  const { currentSpace } = useSpaces();
  const pathname = usePathname();
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const prefetchRoute = useCallback(
    (route: string) => {
      if (!currentSpace?.id || route === pathname) return;

      // Check if already prefetched
      const cacheKey = `${route}-${currentSpace.id}`;
      if (prefetchedRoutes.current.has(cacheKey)) return;

      prefetchedRoutes.current.add(cacheKey);

      // Prefetch data for the feature
      const feature = ROUTE_TO_FEATURE_MAP[route];
      if (feature) {
        prefetchFeatureData(queryClient, feature, currentSpace.id).catch(console.error);
      }
    },
    [queryClient, currentSpace?.id, pathname]
  );

  const getPrefetchHandlers = useCallback(
    (route: string) => {
      let timeout: NodeJS.Timeout | null = null;

      return {
        onMouseEnter: () => {
          // Small delay to avoid prefetching on accidental hovers
          timeout = setTimeout(() => prefetchRoute(route), 100);
        },
        onMouseLeave: () => {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
        },
        onFocus: () => prefetchRoute(route),
      };
    },
    [prefetchRoute]
  );

  return { prefetchRoute, getPrefetchHandlers };
}

// Feature type for prefetching
type PrefetchableFeature = 'tasks' | 'calendar' | 'reminders' | 'messages' | 'shopping' | 'meals' | 'goals' | 'projects' | 'rewards';

/**
 * Hook for automatic prefetching based on current page
 * Prefetches adjacent/related features based on user patterns
 */
export function useSmartPrefetch() {
  const queryClient = useQueryClient();
  const { currentSpace } = useSpaces();
  const pathname = usePathname();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasPrefetched.current || !currentSpace?.id) return;

    hasPrefetched.current = true;

    // Smart prefetch based on current page
    const adjacentFeatures = getAdjacentFeatures(pathname || '');

    // Prefetch adjacent features after a short delay
    const timer = setTimeout(() => {
      adjacentFeatures.forEach((feature) => {
        prefetchFeatureData(queryClient, feature, currentSpace.id).catch(console.error);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [queryClient, currentSpace?.id, pathname]);
}

/**
 * Get adjacent features to prefetch based on current page
 * Based on common navigation patterns
 */
function getAdjacentFeatures(pathname: string): PrefetchableFeature[] {
  const patterns: Record<string, PrefetchableFeature[]> = {
    '/dashboard': ['tasks', 'calendar', 'reminders', 'messages'],
    '/tasks': ['calendar', 'reminders', 'goals'],
    '/calendar': ['tasks', 'reminders', 'meals'],
    '/reminders': ['tasks', 'calendar'],
    '/messages': ['tasks', 'calendar'],
    '/shopping': ['meals', 'tasks'],
    '/meals': ['shopping', 'calendar'],
    '/goals': ['tasks', 'projects'],
    '/projects': ['goals', 'tasks'],
    '/rewards': ['tasks', 'goals'],
  };

  return patterns[pathname] || [];
}
