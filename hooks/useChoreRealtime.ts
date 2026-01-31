'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Chore } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseChoreRealtimeOptions {
  spaceId: string;
  filters?: {
    status?: string[];
    frequency?: string[];
    assignedTo?: string;
    search?: string;
  };
  onChoreAdded?: (chore: Chore) => void;
  onChoreUpdated?: (chore: Chore) => void;
  onChoreDeleted?: (choreId: string) => void;
}

type ChoreCompletion = {
  id: string;
  chore_id: string;
  completed_at?: string;
  [key: string]: unknown;
};

// Optimized filter function
function chorePassesFilters(chore: Chore, filters?: UseChoreRealtimeOptions['filters']): boolean {
  if (!filters) return true;

  return (
    (!filters.status ||
      (Array.isArray(filters.status) ? filters.status.includes(chore.status) : filters.status === chore.status)) &&
    (!filters.frequency ||
      (Array.isArray(filters.frequency) ? filters.frequency.includes(chore.frequency) : filters.frequency === chore.frequency)) &&
    (!filters.assignedTo || chore.assigned_to === filters.assignedTo)
  );
}

// Debounce helper for batched state updates
function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

export function useChoreRealtime({
  spaceId,
  filters,
  onChoreAdded,
  onChoreUpdated,
  onChoreDeleted,
}: UseChoreRealtimeOptions) {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable refs for values that shouldn't trigger effect re-runs
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const callbacksRef = useRef({ onChoreAdded, onChoreUpdated, onChoreDeleted });
  callbacksRef.current = { onChoreAdded, onChoreUpdated, onChoreDeleted };

  // Performance optimizations: batch updates queue
  const updateQueueRef = useRef<{
    inserts: Chore[];
    updates: Chore[];
    deletes: string[];
  }>({ inserts: [], updates: [], deletes: [] });

  // Debounced batch update function - use useRef to avoid recreation
  const debouncedBatchUpdateRef = useRef<(() => void) | null>(null);

  if (!debouncedBatchUpdateRef.current) {
    debouncedBatchUpdateRef.current = debounce(() => {
      const queue = updateQueueRef.current;
      if (queue.inserts.length === 0 && queue.updates.length === 0 && queue.deletes.length === 0) {
        return;
      }

      setChores(prev => {
        let result = [...prev];

        // Process deletes first
        if (queue.deletes.length > 0) {
          const deleteSet = new Set(queue.deletes);
          result = result.filter(chore => !deleteSet.has(chore.id));
        }

        // Process updates
        if (queue.updates.length > 0) {
          const updateMap = new Map(queue.updates.map(chore => [chore.id, chore]));
          result = result.map(chore => updateMap.get(chore.id) || chore);
        }

        // Process inserts
        if (queue.inserts.length > 0) {
          const existingIds = new Set(result.map(chore => chore.id));
          const newChores = queue.inserts.filter(chore => !existingIds.has(chore.id));
          result = [...result, ...newChores];
        }

        // Sort once at the end (handle null sort_order)
        return result.sort((a, b) => {
          const aOrder = a.sort_order ?? 999999;
          const bOrder = b.sort_order ?? 999999;
          return aOrder - bOrder;
        });
      });

      // Clear the queue
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    }, 50); // 50ms debounce for smooth updates
  }

  const debouncedBatchUpdate = debouncedBatchUpdateRef.current;

  useEffect(() => {
    // Guard against invalid spaceId to prevent empty query parameters
    if (!spaceId || spaceId.trim() === '') {
      setChores([]);
      setLoading(false);
      setError(null); // Don't set error for intentional skips
      return;
    }

    const supabase = createClient();

    // Verify user still has access to this space
    async function verifyAccess(): Promise<boolean> {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return false;
        }

        const { data: membership, error: memberError } = await supabase
          .from('space_members')
          .select('user_id, role')
          .eq('space_id', spaceId)
          .eq('user_id', user.id)
          .single();

        return !memberError && !!membership;
      } catch (err) {
        logger.warn('[useChoreRealtime] Access verification timeout or error:', { component: 'hook-useChoreRealtime', error: err });
        return false;
      }
    }

    async function loadChores() {
      try {
        // Verify access before loading
        const hasAccess = await verifyAccess();
        if (!hasAccess) {
          setError(new Error('You do not have access to this space'));
          setLoading(false);
          return;
        }

        const currentFilters = filtersRef.current;

        let query = supabase
          .from('chores')
          .select('*')
          .eq('space_id', spaceId)
          .order('sort_order', { ascending: true, nullsFirst: false });

        // Apply filters from ref
        if (currentFilters?.status) {
          if (Array.isArray(currentFilters.status)) {
            query = query.in('status', currentFilters.status);
          } else {
            query = query.eq('status', currentFilters.status);
          }
        }
        if (currentFilters?.frequency) {
          if (Array.isArray(currentFilters.frequency)) {
            query = query.in('frequency', currentFilters.frequency);
          } else {
            query = query.eq('frequency', currentFilters.frequency);
          }
        }
        if (currentFilters?.assignedTo) {
          query = query.eq('assigned_to', currentFilters.assignedTo);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setChores(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    const channel = supabase
      .channel(`chores:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chores',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Chore>) => {
          const newChore = payload.new as Chore;

          if (chorePassesFilters(newChore, filtersRef.current)) {
            // Add to batch queue instead of immediate state update
            updateQueueRef.current.inserts.push(newChore);
            debouncedBatchUpdate();
            callbacksRef.current.onChoreAdded?.(newChore);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chores',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Chore>) => {
          const updatedChore = payload.new as Chore;

          if (chorePassesFilters(updatedChore, filtersRef.current)) {
            // Add to batch queue for updates
            updateQueueRef.current.updates.push(updatedChore);
            debouncedBatchUpdate();
            callbacksRef.current.onChoreUpdated?.(updatedChore);
          } else {
            // Chore no longer passes filters, add to deletes queue
            updateQueueRef.current.deletes.push(updatedChore.id);
            debouncedBatchUpdate();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chores',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Chore>) => {
          const deletedChoreId = (payload.old as Chore).id;
          // Add to batch queue for deletes
          updateQueueRef.current.deletes.push(deletedChoreId);
          debouncedBatchUpdate();
          callbacksRef.current.onChoreDeleted?.(deletedChoreId);
        }
      )
      .subscribe();

    loadChores();

    // Periodic access verification (every 15 minutes)
    const accessCheckInterval = setInterval(async () => {
      const hasAccess = await verifyAccess();

      if (!hasAccess) {
        // Access revoked - disconnect and clear data
        if (channel) {
          supabase.removeChannel(channel);
        }
        clearInterval(accessCheckInterval);
        setChores([]);
        setError(new Error('Access to this space has been revoked'));
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup subscription and interval on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (accessCheckInterval) {
        clearInterval(accessCheckInterval);
      }
      // Clear any pending batched updates
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    };
  }, [spaceId]); // Only spaceId triggers teardown/rebuild

  function refreshChores() {
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    // The useEffect will handle the actual fetch
  }

  return {
    chores,
    loading,
    error,
    refreshChores,
    setChores, // Expose for optimistic updates
  };
}

// Hook for chore completion history real-time updates
export function useChoreCompletionRealtime(choreId: string) {
  const [completions, setCompletions] = useState<ChoreCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadCompletions() {
      try {
        const { data, error } = await supabase
          .from('chore_completions')
          .select('*')
          .eq('chore_id', choreId)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setCompletions(data || []);
      } catch (err) {
        logger.error('Error loading chore completions:', err, { component: 'hook-useChoreRealtime', action: 'hook_execution' });
      } finally {
        setLoading(false);
      }
    }

    const channel = supabase
      .channel(`chore_completions:${choreId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chore_completions',
          filter: `chore_id=eq.${choreId}`,
        },
        () => {
          loadCompletions();
        }
      )
      .subscribe();

    loadCompletions();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [choreId]);

  return { completions, loading, setCompletions };
}
