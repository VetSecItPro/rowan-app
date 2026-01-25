/**
 * Offline-Aware Mutation Hook
 *
 * Wraps React Query's useMutation to automatically queue mutations when offline.
 * Seamlessly syncs when connection is restored.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import {
  enqueueMutation,
  loadMutationQueue,
  processQueue,
  registerBackgroundSync,
  type QueuedMutation,
} from '@/lib/react-query/mutation-queue';

export interface OfflineMutationOptions<TData, TVariables> {
  /** API endpoint for the mutation */
  endpoint: string;
  /** HTTP method */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** The actual mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Entity type for conflict resolution */
  entityType?: string;
  /** Function to extract entity ID from variables */
  getEntityId?: (variables: TVariables) => string;
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Mutation key for deduplication */
  mutationKey?: string[];
  /** Callback after successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback after failed mutation (not called for offline queuing) */
  onError?: (error: Error, variables: TVariables) => void;
}

export interface OfflineMutationResult<TData, TVariables> {
  /** Trigger the mutation */
  mutate: (variables: TVariables) => void;
  /** Trigger the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Whether mutation is currently executing */
  isPending: boolean;
  /** Whether mutation is queued for offline sync */
  isQueued: boolean;
  /** Number of pending mutations in queue */
  pendingCount: number;
  /** Whether mutation was successful */
  isSuccess: boolean;
  /** Whether mutation errored */
  isError: boolean;
  /** The error if any */
  error: Error | null;
  /** The response data */
  data: TData | undefined;
  /** Reset the mutation state */
  reset: () => void;
}

/**
 * Hook for offline-aware mutations
 *
 * Usage:
 * ```tsx
 * const mutation = useOfflineMutation({
 *   endpoint: '/api/tasks',
 *   method: 'POST',
 *   mutationFn: (data) => createTask(data),
 *   entityType: 'task',
 *   invalidateKeys: [['tasks']],
 * });
 *
 * // Works online and offline!
 * mutation.mutate({ title: 'New Task' });
 * ```
 */
export function useOfflineMutation<TData = unknown, TVariables = unknown>({
  endpoint,
  method = 'POST',
  mutationFn,
  entityType,
  getEntityId,
  invalidateKeys = [],
  mutationKey,
  onSuccess,
  onError,
}: OfflineMutationOptions<TData, TVariables>): OfflineMutationResult<TData, TVariables> {
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [isQueued, setIsQueued] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending count on mount
  useEffect(() => {
    loadMutationQueue().then((state) => {
      setPendingCount(state.mutations.length);
    });
  }, []);

  // Process queue when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      processQueue().then((result) => {
        setPendingCount((prev) => prev - result.succeeded);

        // Invalidate queries after successful sync
        if (result.succeeded > 0) {
          invalidateKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      });
    }
  }, [isOnline, pendingCount, queryClient, invalidateKeys]);

  const mutation = useMutation<TData, Error, TVariables>({
    mutationKey,
    mutationFn: async (variables) => {
      // If online, execute normally
      if (isOnline) {
        return mutationFn(variables);
      }

      // If offline, queue the mutation
      const queuedMutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'> = {
        endpoint,
        method,
        body: variables,
        maxRetries: 3,
        entityType,
        entityId: getEntityId?.(variables),
        mutationKey: mutationKey?.join(':'),
      };

      await enqueueMutation(queuedMutation);
      setIsQueued(true);
      setPendingCount((prev) => prev + 1);

      // Register background sync
      await registerBackgroundSync();

      // Throw a special error to signal offline queuing
      throw new OfflineQueuedError('Mutation queued for offline sync');
    },

    onSuccess: (data, variables) => {
      setIsQueued(false);

      // Invalidate queries
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call user callback
      onSuccess?.(data, variables);
    },

    onError: (error, variables) => {
      // Don't treat offline queuing as a real error
      if (error instanceof OfflineQueuedError) {
        return;
      }

      // Call user callback
      onError?.(error, variables);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isQueued,
    pendingCount,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError && !(mutation.error instanceof OfflineQueuedError),
    error: mutation.error instanceof OfflineQueuedError ? null : mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

/**
 * Special error class for queued mutations
 */
export class OfflineQueuedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

/**
 * Hook to get mutation queue status
 */
export function useMutationQueueStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const updateCount = async () => {
      const state = await loadMutationQueue();
      setPendingCount(state.mutations.length);
    };

    updateCount();

    // Update periodically
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const processNow = useCallback(async () => {
    if (!isOnline || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await processQueue();
      setPendingCount((prev) => Math.max(0, prev - result.succeeded));
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing]);

  return {
    pendingCount,
    isProcessing,
    processNow,
    isOnline,
  };
}

/**
 * Simple wrapper for common mutation patterns
 */
export function createOfflineMutation<TData, TVariables>(config: {
  endpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  entityType?: string;
}) {
  return (mutationFn: (variables: TVariables) => Promise<TData>) => ({
    ...config,
    mutationFn,
  });
}
