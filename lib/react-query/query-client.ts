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

      // BACKGROUND REFETCHING: Keep data fresh while showing cached data
      refetchOnWindowFocus: true,   // Refetch when user returns to tab
      refetchOnReconnect: true,     // Refetch when internet reconnects
      refetchOnMount: 'always',     // Always check for fresh data on mount

      // RETRY CONFIGURATION: Smart retries for failed requests
      retry: (failureCount, error: any) => {
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
 * Utility function to invalidate related queries
 *
 * Use this when data changes to ensure cache consistency
 */
export const invalidateQueries = {
  auth: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
  spaces: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
  userSpace: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'profile', userId] });
    queryClient.invalidateQueries({ queryKey: ['spaces', 'all', userId] });
  },
} as const;

/**
 * Development helpers
 */
export const queryClientDevtools = {
  clearCache: () => queryClient.clear(),
  getQueryData: (queryKey: unknown[]) => queryClient.getQueryData(queryKey),
  setQueryData: (queryKey: unknown[], data: unknown) => queryClient.setQueryData(queryKey, data),
} as const;