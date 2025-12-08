'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Reminder } from '@/lib/services/reminders-service';
import { toast } from 'sonner';

interface UseRemindersRealtimeOptions {
  spaceId: string;
  filters?: {
    status?: string[];
    priority?: string[];
    category?: string[];
    assignedTo?: string;
  };
  onReminderAdded?: (reminder: Reminder) => void;
  onReminderUpdated?: (reminder: Reminder) => void;
  onReminderDeleted?: (reminderId: string) => void;
}

// Optimized filter function
function reminderPassesFilters(reminder: Reminder, filters?: UseRemindersRealtimeOptions['filters']): boolean {
  if (!filters) return true;

  return (
    (!filters.status || filters.status.includes(reminder.status)) &&
    (!filters.priority || !reminder.priority || filters.priority.includes(reminder.priority)) &&
    (!filters.category || !reminder.category || filters.category.includes(reminder.category)) &&
    (!filters.assignedTo || reminder.assigned_to === filters.assignedTo)
  );
}

// Debounce helper for state updates
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

export function useRemindersRealtime({
  spaceId,
  filters,
  onReminderAdded,
  onReminderUpdated,
  onReminderDeleted,
}: UseRemindersRealtimeOptions) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Performance optimizations
  const updateQueueRef = useRef<{
    inserts: Reminder[];
    updates: Reminder[];
    deletes: string[];
  }>({ inserts: [], updates: [], deletes: [] });

  // Memoized filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters?.status?.join(','),
    filters?.priority?.join(','),
    filters?.category?.join(','),
    filters?.assignedTo
  ]);

  // Memoized filter function to avoid recalculation
  const reminderFilter = useCallback((reminder: Reminder) => reminderPassesFilters(reminder, memoizedFilters), [memoizedFilters]);

  // Debounced batch update function - use useRef to avoid recreation
  const debouncedBatchUpdateRef = useRef<(() => void) | null>(null);

  if (!debouncedBatchUpdateRef.current) {
    debouncedBatchUpdateRef.current = debounce(() => {
      const queue = updateQueueRef.current;
      if (queue.inserts.length === 0 && queue.updates.length === 0 && queue.deletes.length === 0) {
        return;
      }

      setReminders(prev => {
        let result = [...prev];

        // Process deletes first
        if (queue.deletes.length > 0) {
          const deleteSet = new Set(queue.deletes);
          result = result.filter(reminder => !deleteSet.has(reminder.id));
        }

        // Process updates
        if (queue.updates.length > 0) {
          const updateMap = new Map(queue.updates.map(reminder => [reminder.id, reminder]));
          result = result.map(reminder => updateMap.get(reminder.id) || reminder);
        }

        // Process inserts
        if (queue.inserts.length > 0) {
          const existingIds = new Set(result.map(reminder => reminder.id));
          const newReminders = queue.inserts.filter(reminder => !existingIds.has(reminder.id));
          result = [...result, ...newReminders];
        }

        // Sort by reminder_time (soonest first), nulls last
        return result.sort((a, b) => {
          if (!a.reminder_time && !b.reminder_time) return 0;
          if (!a.reminder_time) return 1;
          if (!b.reminder_time) return -1;
          return new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime();
        });
      });

      // Clear the queue
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    }, 50); // 50ms debounce for smooth updates
  }

  const debouncedBatchUpdate = debouncedBatchUpdateRef.current;

  // Emergency timeout to prevent perpetual loading (12 seconds max)
  useEffect(() => {
    if (!spaceId) return;

    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[useRemindersRealtime] Emergency timeout reached - forcing loading completion');
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

    // Guard against invalid spaceId to prevent unnecessary queries
    if (!spaceId || spaceId.trim() === '') {
      setReminders([]);
      setLoading(false);
      setError(null); // Don't set error for intentional skips
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel;
    let accessCheckInterval: NodeJS.Timeout;

    // Verify user still has access to this space
    async function verifyAccess(): Promise<boolean> {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData?.user) {
          return false;
        }

        const { data: membership, error: memberError } = await supabase
          .from('space_members')
          .select('user_id')
          .eq('space_id', spaceId)
          .eq('user_id', authData.user.id)
          .single();

        return !memberError && !!membership;
      } catch (err) {
        console.warn('[useRemindersRealtime] Access verification timeout or error:', err);
        return false;
      }
    }

    async function loadReminders() {
      try {
        // If timeout already reached, skip loading and use empty state
        if (timeoutReached) {
          console.warn('[useRemindersRealtime] Timeout reached - skipping data load');
          setReminders([]);
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
          .from('reminders')
          .select(`
            *,
            assignee:assigned_to (
              id,
              name,
              email,
              avatar_url
            ),
            snoozer:snoozed_by (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq('space_id', spaceId)
          .order('reminder_time', { ascending: true });

        // Apply filters
        if (filters?.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters?.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }
        if (filters?.category && filters.category.length > 0) {
          query = query.in('category', filters.category);
        }
        if (filters?.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Map the data to handle null assignee/snoozer
        const mappedData = ((data as Reminder[]) || []).map((reminder: Reminder) => ({
          ...reminder,
          assignee: reminder.assignee || undefined,
          snoozer: reminder.snoozer || undefined,
        }));

        setReminders(mappedData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    function setupRealtimeSubscription() {
      channel = supabase
        .channel(`reminders:${spaceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reminders',
            filter: `space_id=eq.${spaceId}`,
          },
          (payload: RealtimePostgresChangesPayload<Reminder>) => {
            const newReminder = payload.new as Reminder;

            if (reminderFilter(newReminder)) {
              // Add to batch queue instead of immediate state update
              updateQueueRef.current.inserts.push(newReminder);
              debouncedBatchUpdate();
              onReminderAdded?.(newReminder);

              // Toast notification for new reminders
              toast.success('New reminder added', {
                description: newReminder.title,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reminders',
            filter: `space_id=eq.${spaceId}`,
          },
          (payload: RealtimePostgresChangesPayload<Reminder>) => {
            const updatedReminder = payload.new as Reminder;

            if (reminderFilter(updatedReminder)) {
              // Add to batch queue for updates
              updateQueueRef.current.updates.push(updatedReminder);
              debouncedBatchUpdate();
              onReminderUpdated?.(updatedReminder);

              // Toast notification for status changes
              if (payload.old && (payload.old as Reminder).status !== updatedReminder.status) {
                if (updatedReminder.status === 'completed') {
                  toast.success('Reminder completed', {
                    description: updatedReminder.title,
                  });
                } else if (updatedReminder.status === 'snoozed') {
                  toast.info('Reminder snoozed', {
                    description: updatedReminder.title,
                  });
                }
              }
            } else {
              // Reminder no longer passes filters, add to deletes queue
              updateQueueRef.current.deletes.push(updatedReminder.id);
              debouncedBatchUpdate();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'reminders',
            filter: `space_id=eq.${spaceId}`,
          },
          (payload: RealtimePostgresChangesPayload<Reminder>) => {
            const deletedReminderId = (payload.old as Reminder).id;
            // Add to batch queue for deletes
            updateQueueRef.current.deletes.push(deletedReminderId);
            debouncedBatchUpdate();
            onReminderDeleted?.(deletedReminderId);

            // Toast notification for deletions
            toast.info('Reminder deleted');
          }
        )
        .subscribe();
    }

    loadReminders();
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
        setReminders([]);
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
      // Clear any pending debounced updates
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    };
  }, [spaceId, memoizedFilters]); // Only depend on spaceId and memoized filters

  function refreshReminders() {
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    // The useEffect will handle the actual fetch
  }

  return {
    reminders,
    loading,
    error,
    refreshReminders,
    setReminders, // Expose for optimistic updates
  };
}
