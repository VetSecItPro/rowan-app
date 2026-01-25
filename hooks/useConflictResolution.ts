/**
 * Conflict Resolution Hook
 *
 * Manages conflicts from offline mutations that couldn't be synced
 * due to server data changes.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getConflicts,
  getConflictCount,
  resolveConflict,
  clearConflicts,
  type ConflictedMutation,
} from '@/lib/react-query/mutation-queue';

export interface UseConflictResolutionResult {
  /** List of pending conflicts */
  conflicts: ConflictedMutation[];
  /** Number of pending conflicts */
  conflictCount: number;
  /** Whether conflicts are being loaded */
  isLoading: boolean;
  /** Whether a resolution is in progress */
  isResolving: boolean;
  /** Resolve a conflict with client data (overwrites server) */
  resolveWithClient: (mutationId: string) => Promise<boolean>;
  /** Resolve a conflict with server data (discards client changes) */
  resolveWithServer: (mutationId: string) => Promise<boolean>;
  /** Discard a conflict without taking action */
  discardConflict: (mutationId: string) => Promise<boolean>;
  /** Clear all conflicts */
  clearAll: () => Promise<void>;
  /** Refresh the conflict list */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing offline mutation conflicts
 *
 * Usage:
 * ```tsx
 * const { conflicts, resolveWithClient, resolveWithServer } = useConflictResolution();
 *
 * // Show conflict UI
 * {conflicts.map(conflict => (
 *   <ConflictCard
 *     key={conflict.id}
 *     conflict={conflict}
 *     onUseClient={() => resolveWithClient(conflict.id)}
 *     onUseServer={() => resolveWithServer(conflict.id)}
 *   />
 * ))}
 * ```
 */
export function useConflictResolution(): UseConflictResolutionResult {
  const [conflicts, setConflicts] = useState<ConflictedMutation[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  // Load conflicts on mount and periodically
  const loadConflicts = useCallback(async () => {
    try {
      const [conflictList, count] = await Promise.all([
        getConflicts(),
        getConflictCount(),
      ]);
      setConflicts(conflictList);
      setConflictCount(count);
    } catch (error) {
      console.warn('[ConflictResolution] Failed to load conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConflicts();

    // Poll for new conflicts periodically
    const interval = setInterval(loadConflicts, 10000);
    return () => clearInterval(interval);
  }, [loadConflicts]);

  const resolveWithClient = useCallback(async (mutationId: string): Promise<boolean> => {
    setIsResolving(true);
    try {
      const result = await resolveConflict(mutationId, 'use-client');
      if (result.success) {
        await loadConflicts();
        return true;
      }
      console.error('[ConflictResolution] Failed to resolve with client:', result.error);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [loadConflicts]);

  const resolveWithServer = useCallback(async (mutationId: string): Promise<boolean> => {
    setIsResolving(true);
    try {
      const result = await resolveConflict(mutationId, 'use-server');
      if (result.success) {
        await loadConflicts();
        return true;
      }
      console.error('[ConflictResolution] Failed to resolve with server:', result.error);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [loadConflicts]);

  const discardConflict = useCallback(async (mutationId: string): Promise<boolean> => {
    setIsResolving(true);
    try {
      const result = await resolveConflict(mutationId, 'discard');
      if (result.success) {
        await loadConflicts();
        return true;
      }
      console.error('[ConflictResolution] Failed to discard conflict:', result.error);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [loadConflicts]);

  const clearAll = useCallback(async () => {
    setIsResolving(true);
    try {
      await clearConflicts();
      await loadConflicts();
    } finally {
      setIsResolving(false);
    }
  }, [loadConflicts]);

  return {
    conflicts,
    conflictCount,
    isLoading,
    isResolving,
    resolveWithClient,
    resolveWithServer,
    discardConflict,
    clearAll,
    refresh: loadConflicts,
  };
}
