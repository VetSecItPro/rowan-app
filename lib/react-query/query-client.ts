/**
 * React Query Configuration
 *
 * Professional-grade caching and data management setup
 * replacing manual localStorage patterns with optimized React Query
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized QueryClient configuration for the Rowan app
 *
 * Key optimizations:
 * - 5-minute stale time (matches current localStorage caching)
 * - 10-minute garbage collection (prevents memory leaks)
 * - Background refetching for fresh data
 * - Intelligent retry with exponential backoff
 * - Request deduplication built-in
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // STALE TIME: Data is fresh for 5 minutes (matching current cache duration)
      staleTime: 5 * 60 * 1000, // 5 minutes

      // GARBAGE COLLECTION: Remove unused data after 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)

      // NOTE: timeout was removed - not supported in React Query v5
      // Consider using AbortController in individual queries for timeout behavior

      // BACKGROUND REFETCHING: Keep data fresh while showing cached data
      refetchOnWindowFocus: true,   // Refetch when user returns to tab
      refetchOnReconnect: true,     // Refetch when internet reconnects
      refetchOnMount: false,        // Trust cache - don't refetch if data exists (staleTime handles freshness)

      // RETRY CONFIGURATION: Smart retries for failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on timeout errors to prevent extended loading times
        if (error?.name === 'AbortError' || error?.code === 'TIMEOUT') {
          return false;
        }

        // Don't retry on 4xx errors (client errors like 401, 404)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }

        // Retry up to 3 times for server errors (5xx) or network errors
        return failureCount < 3;
      },

      // RETRY DELAY: Exponential backoff with jitter
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s with random jitter
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
        const jitter = Math.random() * 1000; // Add 0-1s random delay
        return baseDelay + jitter;
      },

      // NETWORK MODE: Define behavior when offline
      networkMode: 'online', // Only run queries when online (can be changed to 'always' for offline support)
    },

    mutations: {
      // NOTE: timeout was removed - not supported in React Query v5

      // MUTATION RETRIES: Limited retries for mutations to prevent duplicate operations
      retry: 1,

      // MUTATION RETRY DELAY: Quick retry for mutations
      retryDelay: 1000, // 1 second delay

      // NETWORK MODE: Only run mutations when online
      networkMode: 'online',
    },
  },
});

/**
 * Cache Keys for consistent cache management
 *
 * These keys help with cache invalidation and type safety
 */
export const QUERY_KEYS = {
  // Auth-related queries
  auth: {
    profile: (userId: string) => ['auth', 'profile', userId] as const,
    session: () => ['auth', 'session'] as const,
  },

  // Space-related queries
  spaces: {
    all: (userId: string) => ['spaces', 'all', userId] as const,
    current: (userId: string) => ['spaces', 'current', userId] as const,
    members: (spaceId: string) => ['spaces', 'members', spaceId] as const,
  },

  // Feature-specific queries (for future use)
  tasks: {
    all: (spaceId: string) => ['tasks', 'all', spaceId] as const,
    byId: (taskId: string) => ['tasks', 'byId', taskId] as const,
  },

  goals: {
    all: (spaceId: string) => ['goals', 'all', spaceId] as const,
    analytics: (spaceId: string) => ['goals', 'analytics', spaceId] as const,
  },

  calendar: {
    events: (spaceId: string) => ['calendar', 'events', spaceId] as const,
  },
} as const;

/**
 * Query Options Presets
 *
 * Common query configurations for different data types
 */
export const QUERY_OPTIONS = {
  // Auth data: Fresh for 5 minutes, critical for app functionality
  auth: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchOnWindowFocus: true,
  },

  // Spaces data: Fresh for 3 minutes, important for navigation
  spaces: {
    staleTime: 3 * 60 * 1000,  // 3 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchOnWindowFocus: true,
  },

  // Feature data: Fresh for 1 minute, can be more dynamic
  features: {
    staleTime: 1 * 60 * 1000,  // 1 minute
    gcTime: 5 * 60 * 1000,     // 5 minutes
    refetchOnWindowFocus: false, // Less critical data
  },

  // Analytics data: Fresh for 10 minutes, computation-heavy
  analytics: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
    refetchOnWindowFocus: false,
  },
} as const;

/**
 * Intelligent Cache Invalidation System
 *
 * Smart invalidation that understands data relationships and only invalidates
 * what needs to be refreshed, preventing unnecessary API calls
 */
export const intelligentInvalidation = {
  /**
   * Invalidate auth data and related dependencies
   */
  auth: async (userId?: string) => {
    const promises = [queryClient.invalidateQueries({ queryKey: ['auth'] })];

    if (userId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.profile(userId) })
      );
    }

    await Promise.all(promises);
  },

  /**
   * Invalidate spaces data with intelligent dependency management
   */
  spaces: async (userId?: string) => {
    const promises = [queryClient.invalidateQueries({ queryKey: ['spaces'] })];

    if (userId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.all(userId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.current(userId) })
      );
    }

    await Promise.all(promises);
  },

  /**
   * Invalidate specific space and its related data
   */
  space: async (spaceId: string, userId?: string) => {
    const promises = [
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.members(spaceId) }),
      // Invalidate all feature data for this space
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all(spaceId) }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.all(spaceId) }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.events(spaceId) }),
    ];

    // If userId provided, also invalidate user's spaces list
    if (userId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.all(userId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.current(userId) })
      );
    }

    await Promise.all(promises);
  },

  /**
   * Comprehensive user data invalidation (use sparingly)
   */
  userData: async (userId: string) => {
    await Promise.all([
      intelligentInvalidation.auth(userId),
      intelligentInvalidation.spaces(userId),
      // Invalidate all user's analytics data
      queryClient.invalidateQueries({ queryKey: ['goals', 'analytics'] }),
    ]);
  },

  /**
   * Smart space membership invalidation
   * When space membership changes, invalidate affected caches
   */
  spaceMembership: async (spaceId: string, affectedUserIds: string[]) => {
    const promises = [
      // Invalidate space members
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.members(spaceId) }),
    ];

    // Invalidate spaces list for all affected users
    affectedUserIds.forEach(userId => {
      promises.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.all(userId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.spaces.current(userId) })
      );
    });

    await Promise.all(promises);
  },

  /**
   * Feature-specific invalidation with cascade effects
   */
  feature: {
    /**
     * Invalidate tasks and related data
     */
    tasks: async (spaceId: string, taskIds?: string[]) => {
      const promises = [
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all(spaceId) }),
      ];

      if (taskIds) {
        taskIds.forEach(taskId => {
          promises.push(
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks.byId(taskId) })
          );
        });
      }

      // Task changes may affect goals analytics
      promises.push(
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.analytics(spaceId) })
      );

      await Promise.all(promises);
    },

    /**
     * Invalidate goals and dependent analytics
     */
    goals: async (spaceId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.all(spaceId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.goals.analytics(spaceId) }),
      ]);
    },

    /**
     * Invalidate calendar events
     */
    calendar: async (spaceId: string) => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.calendar.events(spaceId)
      });
    },
  },

  /**
   * Conditional invalidation based on data relationships
   */
  conditional: {
    /**
     * Only invalidate if data is currently cached and stale
     */
    async ifStale(queryKey: unknown[], maxAge: number = 5 * 60 * 1000) {
      const queryState = queryClient.getQueryState(queryKey as any);

      if (!queryState || !queryState.dataUpdatedAt) {
        return false;
      }

      const age = Date.now() - queryState.dataUpdatedAt;

      if (age > maxAge) {
        await queryClient.invalidateQueries({ queryKey });
        return true;
      }

      return false;
    },

    /**
     * Invalidate only if data exists in cache
     */
    async ifCached(queryKey: unknown[]) {
      const data = queryClient.getQueryData(queryKey);

      if (data) {
        await queryClient.invalidateQueries({ queryKey });
        return true;
      }

      return false;
    },
  },

  /**
   * Batch invalidation with intelligent grouping
   */
  batch: {
    /**
     * Group related invalidations together for efficiency
     */
    async spaceOperations(operations: Array<{
      type: 'space' | 'tasks' | 'goals' | 'calendar' | 'members';
      spaceId: string;
      userId?: string;
    }>) {
      // Group operations by space to minimize invalidation calls
      const spaceGroups = operations.reduce((groups, op) => {
        if (!groups[op.spaceId]) {
          groups[op.spaceId] = new Set();
        }
        groups[op.spaceId].add(op.type);
        return groups;
      }, {} as Record<string, Set<string>>);

      const promises: Promise<void>[] = [];

      for (const [spaceId, types] of Object.entries(spaceGroups)) {
        if (types.has('space')) {
          promises.push(intelligentInvalidation.space(spaceId));
        } else {
          // Individual feature invalidations
          if (types.has('tasks')) {
            promises.push(intelligentInvalidation.feature.tasks(spaceId));
          }
          if (types.has('goals')) {
            promises.push(intelligentInvalidation.feature.goals(spaceId));
          }
          if (types.has('calendar')) {
            promises.push(intelligentInvalidation.feature.calendar(spaceId));
          }
          if (types.has('members')) {
            promises.push(
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.spaces.members(spaceId)
              })
            );
          }
        }
      }

      await Promise.all(promises);
    },
  },
} as const;

/**
 * Legacy invalidation utilities (for backward compatibility)
 * @deprecated Use intelligentInvalidation instead
 */
export const invalidateQueries = {
  auth: () => intelligentInvalidation.auth(),
  spaces: () => intelligentInvalidation.spaces(),
  userSpace: (userId: string) => intelligentInvalidation.userData(userId),
} as const;

/**
 * Development helpers
 */
export const queryClientDevtools = {
  clearCache: () => queryClient.clear(),
  getQueryData: (queryKey: unknown[]) => queryClient.getQueryData(queryKey),
  setQueryData: (queryKey: unknown[], data: unknown) => queryClient.setQueryData(queryKey, data),
} as const;