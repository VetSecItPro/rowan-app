'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { queryClient } from '@/lib/react-query/query-client';
import { restoreQueryCache, restoreFromBackup, setupCachePersistence } from '@/lib/react-query/offline-persistence';

/**
 * Main App Query Provider
 *
 * Uses the singleton queryClient with offline persistence.
 * Wraps the entire app to enable useQuery/useMutation in all feature pages.
 */
export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Restore cache from IndexedDB, fallback to localStorage backup
    const restore = async () => {
      const restored = await restoreQueryCache(queryClient);
      if (!restored) {
        await restoreFromBackup(queryClient);
      }
    };
    restore();

    // Set up periodic cache persistence + save on unload
    const cleanup = setupCachePersistence(queryClient);
    return cleanup;
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Custom error class for 401 errors to identify session expiration
 */
export class AdminSessionExpiredError extends Error {
  constructor() {
    super('Admin session expired');
    this.name = 'AdminSessionExpiredError';
  }
}

/**
 * Helper to handle 401 errors in admin API fetches
 * Use this in queryFn to properly trigger the global error handler
 */
export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 401) {
    throw new AdminSessionExpiredError();
  }
  return response;
}

/**
 * React Query Provider for Admin Dashboard
 * Implements stale-while-revalidate caching strategy
 * Handles 401 errors globally and redirects to login
 */
export function AdminQueryProvider({ children }: { children: React.ReactNode }) {
  const [adminClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            // Handle 401 errors globally - redirect to login
            if (error instanceof AdminSessionExpiredError || error.message === 'Session expired') {
              // Clear admin session cookie
              document.cookie = 'admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              // Redirect to login
              window.location.href = '/login?redirectTo=/admin/dashboard&error=session_expired';
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            // Handle 401 errors globally for mutations too
            if (error instanceof AdminSessionExpiredError || error.message === 'Session expired') {
              document.cookie = 'admin-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              window.location.href = '/login?redirectTo=/admin/dashboard&error=session_expired';
            }
          },
        }),
        defaultOptions: {
          queries: {
            // Stale-while-revalidate: show cached data immediately, refetch in background
            staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
            gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on tab focus (admin dashboard)
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: (failureCount, error) => {
              // Don't retry on 401 errors
              if (error instanceof AdminSessionExpiredError) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={adminClient}>{children}</QueryClientProvider>;
}
