/**
 * Prefetch Hook
 *
 * Prefetches data and pages on hover for improved perceived performance.
 * Uses React Query's prefetchQuery and Next.js router prefetch.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

interface PrefetchConfig {
  /** Delay before prefetching (ms) */
  delay?: number;
  /** Query key to prefetch */
  queryKey?: unknown[];
  /** Query function to prefetch */
  queryFn?: () => Promise<unknown>;
  /** Stale time for prefetched data */
  staleTime?: number;
  /** Also prefetch the route */
  prefetchRoute?: boolean;
}

/**
 * Hook for prefetching data and routes on hover
 *
 * Example:
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePrefetchOnHover({
 *   route: '/tasks',
 *   queryKey: ['tasks', spaceId],
 *   queryFn: () => fetchTasks(spaceId),
 * });
 *
 * <Link href="/tasks" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   Tasks
 * </Link>
 * ```
 */
export function usePrefetchOnHover({
  route,
  queryKey,
  queryFn,
  delay = 100,
  staleTime = 5 * 60 * 1000,
  prefetchRoute = true,
}: {
  route: string;
} & PrefetchConfig) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPrefetched = useRef(false);

  const doPrefetch = useCallback(async () => {
    // Only prefetch once per component lifecycle
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Prefetch the route
    if (prefetchRoute) {
      router.prefetch(route);
    }

    // Prefetch the data
    if (queryKey && queryFn) {
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      });
    }
  }, [queryClient, router, route, queryKey, queryFn, staleTime, prefetchRoute]);

  const onMouseEnter = useCallback(() => {
    if (hasPrefetched.current) return;

    timeoutRef.current = setTimeout(doPrefetch, delay);
  }, [doPrefetch, delay]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onFocus = useCallback(() => {
    if (hasPrefetched.current) return;
    doPrefetch();
  }, [doPrefetch]);

  return {
    onMouseEnter,
    onMouseLeave,
    onFocus,
    prefetch: doPrefetch,
  };
}

/**
 * Hook for bulk prefetching navigation items
 */
export function useNavigationPrefetch(
  items: Array<{
    href: string;
    queryKey?: unknown[];
    queryFn?: () => Promise<unknown>;
  }>
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const prefetch = useCallback(
    (href: string) => {
      if (prefetchedRoutes.current.has(href)) return;
      prefetchedRoutes.current.add(href);

      const item = items.find((i) => i.href === href);
      if (!item) return;

      // Prefetch route
      router.prefetch(href);

      // Prefetch data
      if (item.queryKey && item.queryFn) {
        queryClient.prefetchQuery({
          queryKey: item.queryKey,
          queryFn: item.queryFn,
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    [items, queryClient, router]
  );

  const getPrefetchHandlers = useCallback(
    (href: string) => {
      let timeout: NodeJS.Timeout | null = null;

      return {
        onMouseEnter: () => {
          timeout = setTimeout(() => prefetch(href), 100);
        },
        onMouseLeave: () => {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
        },
        onFocus: () => prefetch(href),
      };
    },
    [prefetch]
  );

  const prefetchAll = useCallback(() => {
    items.forEach((item) => prefetch(item.href));
  }, [items, prefetch]);

  return {
    prefetch,
    getPrefetchHandlers,
    prefetchAll,
  };
}

/**
 * Hook for prefetching critical data on app load
 */
export function useCriticalDataPrefetch(
  queries: Array<{
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
    priority?: 'high' | 'normal' | 'low';
  }>
) {
  const queryClient = useQueryClient();

  const prefetchCritical = useCallback(async () => {
    // Sort by priority
    const sorted = [...queries].sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return (priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal']);
    });

    // Prefetch high priority first, then others in parallel
    const highPriority = sorted.filter((q) => q.priority === 'high');
    const others = sorted.filter((q) => q.priority !== 'high');

    // Prefetch high priority sequentially for fastest perceived load
    for (const query of highPriority) {
      await queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch others in parallel
    await Promise.all(
      others.map((query) =>
        queryClient.prefetchQuery({
          queryKey: query.queryKey,
          queryFn: query.queryFn,
          staleTime: 5 * 60 * 1000,
        })
      )
    );
  }, [queries, queryClient]);

  return { prefetchCritical };
}

/**
 * Utility to create prefetch handler for a link
 */
export function createPrefetchHandler(
  router: ReturnType<typeof useRouter>,
  href: string,
  delay = 100
) {
  let timeout: NodeJS.Timeout | null = null;
  let prefetched = false;

  return {
    onMouseEnter: () => {
      if (prefetched) return;
      timeout = setTimeout(() => {
        router.prefetch(href);
        prefetched = true;
      }, delay);
    },
    onMouseLeave: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    },
  };
}
