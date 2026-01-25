/**
 * Optimized Request Hook
 *
 * React hook for network-aware requests that automatically:
 * - Adjusts timeouts based on connection quality
 * - Reduces payloads on slow connections
 * - Batches requests when appropriate
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import {
  optimizedFetch,
  getOptimizedPageSize,
  getOptimizedQueryParams,
  optimizeRequestBody,
  getOptimizedImageUrl,
  type RequestPriority,
  type OptimizedRequestConfig,
} from '@/lib/performance/request-optimizer';

export interface UseOptimizedQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, Error>, 'queryFn'> {
  /** API endpoint */
  endpoint: string;
  /** Request priority */
  priority?: RequestPriority;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Fields to exclude on poor connections */
  excludeFields?: string[];
}

export interface UseOptimizedMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request priority */
  priority?: RequestPriority;
  /** Fields to exclude on poor connections */
  excludeFields?: string[];
}

/**
 * Hook for optimized queries with network awareness
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useOptimizedQuery({
 *   queryKey: ['tasks'],
 *   endpoint: '/api/tasks',
 *   priority: 'high',
 *   params: { status: 'active' },
 * });
 * ```
 */
export function useOptimizedQuery<TData = unknown>({
  endpoint,
  priority = 'normal',
  params = {},
  excludeFields = [],
  ...queryOptions
}: UseOptimizedQueryOptions<TData>) {
  const { quality, isOnline } = useNetworkStatus();

  // Optimize params based on connection
  const optimizedParams = useMemo(() => {
    return getOptimizedQueryParams(params);
  }, [params]);

  // Build URL with params
  const url = useMemo(() => {
    const baseUrl = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    Object.entries(optimizedParams).forEach(([key, value]) => {
      baseUrl.searchParams.set(key, String(value));
    });
    return baseUrl.toString();
  }, [endpoint, optimizedParams]);

  const queryFn = useCallback(async (): Promise<TData> => {
    const config: OptimizedRequestConfig = {
      priority,
      allowReducedPayload: excludeFields.length > 0,
      excludeOnPoorConnection: excludeFields,
    };

    const response = await optimizedFetch(url, { method: 'GET' }, config);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }, [url, priority, excludeFields]);

  return useQuery({
    ...queryOptions,
    queryFn,
    enabled: isOnline && (queryOptions.enabled !== false),
    staleTime: quality === 'poor' ? 60000 : queryOptions.staleTime, // Cache longer on poor connection
    gcTime: quality === 'poor' ? 300000 : queryOptions.gcTime, // Keep in cache longer
  });
}

/**
 * Hook for optimized mutations with network awareness
 *
 * Usage:
 * ```tsx
 * const mutation = useOptimizedMutation({
 *   mutationKey: ['createTask'],
 *   endpoint: '/api/tasks',
 *   method: 'POST',
 *   priority: 'high',
 * });
 *
 * mutation.mutate({ title: 'New Task' });
 * ```
 */
export function useOptimizedMutation<TData = unknown, TVariables = unknown>({
  endpoint,
  method = 'POST',
  priority = 'normal',
  excludeFields = [],
  ...mutationOptions
}: UseOptimizedMutationOptions<TData, TVariables>) {
  const mutationFn = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // Optimize the request body
      const optimizedBody = optimizeRequestBody(variables as Record<string, unknown>, {
        excludeFields,
        useDefaults: true,
      });

      const config: OptimizedRequestConfig = {
        priority,
        allowReducedPayload: true,
        excludeOnPoorConnection: excludeFields,
      };

      const response = await optimizedFetch(
        endpoint,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optimizedBody),
        },
        config
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response.json();
    },
    [endpoint, method, priority, excludeFields]
  );

  return useMutation({
    ...mutationOptions,
    mutationFn,
  });
}

/**
 * Hook for getting optimized page size based on connection
 */
export function useOptimizedPageSize(defaultSize: number = 20): number {
  const { quality } = useNetworkStatus();

  return useMemo(() => {
    return getOptimizedPageSize(defaultSize);
  }, [defaultSize, quality]);
}

/**
 * Hook for getting optimized image URLs
 */
export function useOptimizedImage(
  baseUrl: string,
  options: { width?: number; height?: number } = {}
): string {
  const { quality } = useNetworkStatus();

  return useMemo(() => {
    return getOptimizedImageUrl(baseUrl, options);
  }, [baseUrl, options.width, options.height, quality]);
}

/**
 * Export utility functions for direct use
 */
export {
  optimizedFetch,
  getOptimizedPageSize,
  getOptimizedQueryParams,
  optimizeRequestBody,
  getOptimizedImageUrl,
};
