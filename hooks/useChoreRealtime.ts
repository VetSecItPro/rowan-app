'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Chore } from '@/lib/types';

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
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Emergency timeout to prevent perpetual loading (12 seconds max)
  useEffect(() => {
    if (!spaceId || spaceId === 'skip') return;

    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[useChoreRealtime] Emergency timeout reached - forcing loading completion');
        setTimeoutReached(true);
        setLoading(false);
        setError(new Error('Loading timeout - please refresh to try again'));
      }
    }, 12000); // 12 second emergency timeout

    return () => clearTimeout(emergencyTimeout);
  }, [spaceId, loading]);

  useEffect(() => {
    // Reset timeout state when spaceId changes
    setTimeoutReached(false);

    // Guard against invalid spaceId to prevent empty query parameters
    if (!spaceId || spaceId.trim() === '' || spaceId === 'undefined' || spaceId === 'null' || spaceId === 'placeholder' || spaceId === 'skip') {
      setChores([]);
      setLoading(false);
      setError(null); // Don't set error for intentional skips
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel;
    let accessCheckInterval: NodeJS.Timeout;

    // Timeout wrapper to prevent hanging operations
    function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    }

    // Verify user still has access to this space
    async function verifyAccess(): Promise<boolean> {
      try {
        // Add 8-second timeout to individual operations
        const { data: { user }, error: authError } = await withTimeout(
          supabase.auth.getUser(),
          8000
        );

        if (authError || !user) {
          return false;
        }

        const { data: membership, error: memberError } = await withTimeout(
          supabase
            .from('space_members')
            .select('user_id, role')
            .eq('space_id', spaceId)
            .eq('user_id', user.id)
            .single(),
          8000
        );

        return !memberError && !!membership;
      } catch (err) {
        console.warn('[useChoreRealtime] Access verification timeout or error:', err);
        return false;
      }
    }

    async function loadChores() {
      try {
        // If timeout already reached, skip loading and use empty state
        if (timeoutReached) {
          console.warn('[useChoreRealtime] Timeout reached - skipping data load');
          setChores([]);
          setLoading(false);
          return;
        }

        // Verify access before loading with timeout protection
        const hasAccess = await verifyAccess();
        if (!hasAccess) {
          setError(new Error('You do not have access to this space'));
          setLoading(false);
          return;
        }

        let query = supabase
          .from('chores')
          .select('*')
          .eq('space_id', spaceId)
          .order('sort_order', { ascending: true, nullsFirst: false });

        // Apply filters
        if (filters?.status) {
          if (Array.isArray(filters.status)) {
            query = query.in('status', filters.status);
          } else {
            query = query.eq('status', filters.status);
          }
        }
        if (filters?.frequency) {
          if (Array.isArray(filters.frequency)) {
            query = query.in('frequency', filters.frequency);
          } else {
            query = query.eq('frequency', filters.frequency);
          }
        }
        if (filters?.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo);
        }

        const { data, error: fetchError } = await withTimeout(query, 10000); // 10 second timeout for data fetch

        if (fetchError) throw fetchError;

        setChores(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    function setupRealtimeSubscription() {
      channel = supabase
        .channel(`chores:${spaceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chores',
            filter: `space_id=eq.${spaceId}`,
          },
          (payload) => {
            const newChore = payload.new as Chore;

            // Apply filters
            const passesFilters =
              (!filters?.status ||
                (Array.isArray(filters.status) ? filters.status.includes(newChore.status) : filters.status === newChore.status)) &&
              (!filters?.frequency ||
                (Array.isArray(filters.frequency) ? filters.frequency.includes(newChore.frequency) : filters.frequency === newChore.frequency)) &&
              (!filters?.assignedTo || newChore.assigned_to === filters.assignedTo);

            if (passesFilters) {
              setChores((prev) => {
                // Check if chore already exists (prevent duplicates)
                if (prev.some((c) => c.id === newChore.id)) {
                  return prev;
                }
                // Insert in sort order (handle nulls)
                const updated = [...prev, newChore].sort((a, b) => {
                  const aOrder = a.sort_order ?? 999999;
                  const bOrder = b.sort_order ?? 999999;
                  return aOrder - bOrder;
                });
                return updated;
              });
              onChoreAdded?.(newChore);
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
          (payload) => {
            const updatedChore = payload.new as Chore;

            // Apply filters
            const passesFilters =
              (!filters?.status ||
                (Array.isArray(filters.status) ? filters.status.includes(updatedChore.status) : filters.status === updatedChore.status)) &&
              (!filters?.frequency ||
                (Array.isArray(filters.frequency) ? filters.frequency.includes(updatedChore.frequency) : filters.frequency === updatedChore.frequency)) &&
              (!filters?.assignedTo || updatedChore.assigned_to === filters.assignedTo);

            if (passesFilters) {
              setChores((prev) => {
                const index = prev.findIndex((c) => c.id === updatedChore.id);
                if (index === -1) {
                  // Chore wasn't in list, add it
                  return [...prev, updatedChore].sort((a, b) => {
                    const aOrder = a.sort_order ?? 999999;
                    const bOrder = b.sort_order ?? 999999;
                    return aOrder - bOrder;
                  });
                }
                // Update existing chore
                const updated = [...prev];
                updated[index] = updatedChore;
                return updated.sort((a, b) => {
                  const aOrder = a.sort_order ?? 999999;
                  const bOrder = b.sort_order ?? 999999;
                  return aOrder - bOrder;
                });
              });
              onChoreUpdated?.(updatedChore);
            } else {
              // Chore no longer passes filters, remove it
              setChores((prev) => prev.filter((c) => c.id !== updatedChore.id));
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
          (payload) => {
            const deletedChoreId = (payload.old as Chore).id;
            setChores((prev) => prev.filter((c) => c.id !== deletedChoreId));
            onChoreDeleted?.(deletedChoreId);
          }
        )
        .subscribe();
    }

    loadChores();
    setupRealtimeSubscription();

    // Periodic access verification (every 15 minutes)
    accessCheckInterval = setInterval(async () => {
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
    };
  }, [spaceId, filters?.status, filters?.frequency, filters?.assignedTo]);

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
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

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
        console.error('Error loading chore completions:', err);
      } finally {
        setLoading(false);
      }
    }

    channel = supabase
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