'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * React Query Provider for Admin Dashboard
 * Implements stale-while-revalidate caching strategy
 */
export function AdminQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale-while-revalidate: show cached data immediately, refetch in background
            staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
            gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on tab focus (admin dashboard)
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: 1, // Only retry failed requests once
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
