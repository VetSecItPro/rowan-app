'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Task } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseTaskRealtimeOptions {
  spaceId: string;
  filters?: {
    status?: string[];
    priority?: string[];
    assignedTo?: string;
  };
  onTaskAdded?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

type SubtaskRecord = {
  id: string;
  title: string;
  completed: boolean;
  sort_order: number | null;
  parent_task_id: string;
  created_at: string;
  updated_at: string;
};

type CommentRecord = {
  id: string;
  content: string;
  user_id: string;
  task_id: string;
  created_at: string;
  updated_at: string;
};

// Optimized filter function
function taskPassesFilters(task: Task, filters?: UseTaskRealtimeOptions['filters']): boolean {
  if (!filters) return true;

  return (
    (!filters.status || filters.status.includes(task.status)) &&
    (!filters.priority || filters.priority.includes(task.priority)) &&
    (!filters.assignedTo || task.assigned_to === filters.assignedTo)
  );
}

/**
 * Debounce helper with cancel support for batched state updates.
 * Used to batch rapid real-time updates into single React state changes.
 */
type DebouncedFn<T extends (...args: unknown[]) => void> = T & { cancel: () => void };
function debounce<T extends (...args: unknown[]) => void>(func: T, delay: number): DebouncedFn<T> {
  let timeoutId: NodeJS.Timeout;
  const debounced = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as DebouncedFn<T>;
  debounced.cancel = () => clearTimeout(timeoutId);
  return debounced;
}

export function useTaskRealtime({
  spaceId,
  filters,
  onTaskAdded,
  onTaskUpdated,
  onTaskDeleted,
}: UseTaskRealtimeOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable refs for values that shouldn't trigger effect re-runs
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const callbacksRef = useRef({ onTaskAdded, onTaskUpdated, onTaskDeleted });
  callbacksRef.current = { onTaskAdded, onTaskUpdated, onTaskDeleted };

  // Ref to hold the loadTasks function so refreshTasks can call it
  const loadDataRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Batched real-time update queue.
   *
   * Problem: Supabase real-time can fire many events in rapid succession (e.g., bulk
   * drag-drop reorder sends N updates). Without batching, each event triggers a
   * separate React state update, causing UI flicker and performance issues.
   *
   * Solution: Queue incoming changes by type (insert/update/delete) and apply
   * them together after a 50ms debounce window. This batches rapid-fire events
   * into a single state update.
   */
  const updateQueueRef = useRef<{
    inserts: Task[];
    updates: Task[];
    deletes: string[];
  }>({ inserts: [], updates: [], deletes: [] });

  // Debounced batch processor - persisted in ref to avoid recreation
  const debouncedBatchUpdateRef = useRef<DebouncedFn<() => void> | null>(null);

  if (!debouncedBatchUpdateRef.current) {
    debouncedBatchUpdateRef.current = debounce(() => {
      const queue = updateQueueRef.current;
      if (queue.inserts.length === 0 && queue.updates.length === 0 && queue.deletes.length === 0) {
        return;
      }

      setTasks(prev => {
        let result = [...prev];

        // Order matters: delete first to avoid updating tasks about to be removed
        if (queue.deletes.length > 0) {
          const deleteSet = new Set(queue.deletes);
          result = result.filter(task => !deleteSet.has(task.id));
        }

        // Apply updates using Map for O(1) lookup
        if (queue.updates.length > 0) {
          const updateMap = new Map(queue.updates.map(task => [task.id, task]));
          result = result.map(task => updateMap.get(task.id) || task);
        }

        // Add new tasks, filtering duplicates (might already exist from optimistic update)
        if (queue.inserts.length > 0) {
          const existingIds = new Set(result.map(task => task.id));
          const newTasks = queue.inserts.filter(task => !existingIds.has(task.id));
          result = [...result, ...newTasks];
        }

        // Single sort at the end instead of sorting after each operation
        return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });

      // Clear queue after processing
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    }, 50); // 50ms batching window - balances responsiveness vs performance
  }

  const debouncedBatchUpdate = debouncedBatchUpdateRef.current;

  useEffect(() => {
    // Guard against invalid spaceId to prevent unnecessary queries
    if (!spaceId || spaceId.trim() === '') {
      setTasks([]);
      setLoading(false);
      setError(null); // Don't set error for intentional skips
      return;
    }

    const supabase = createClient();

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
        logger.warn('[useTaskRealtime] Access verification timeout or error:', { component: 'hook-useTaskRealtime', error: err });
        return false;
      }
    }

    async function loadTasks() {
      // Store ref so refreshTasks can call this
      loadDataRef.current = loadTasks;
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
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            category,
            due_date,
            assigned_to,
            created_by,
            sort_order,
            created_at,
            updated_at,
            space_id
          `)
          .eq('space_id', spaceId)
          .order('sort_order', { ascending: true });

        // Apply filters from ref
        if (currentFilters?.status && currentFilters.status.length > 0) {
          query = query.in('status', currentFilters.status);
        }
        if (currentFilters?.priority && currentFilters.priority.length > 0) {
          query = query.in('priority', currentFilters.priority);
        }
        if (currentFilters?.assignedTo) {
          query = query.eq('assigned_to', currentFilters.assignedTo);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setTasks((data as Task[]) || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    const channel = supabase
      .channel(`tasks:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          const newTask = payload.new as Task;

          if (taskPassesFilters(newTask, filtersRef.current)) {
            // Add to batch queue instead of immediate state update
            updateQueueRef.current.inserts.push(newTask);
            debouncedBatchUpdate();
            callbacksRef.current.onTaskAdded?.(newTask);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          const updatedTask = payload.new as Task;

          if (taskPassesFilters(updatedTask, filtersRef.current)) {
            // Add to batch queue for updates
            updateQueueRef.current.updates.push(updatedTask);
            debouncedBatchUpdate();
            callbacksRef.current.onTaskUpdated?.(updatedTask);
          } else {
            // Task no longer passes filters, add to deletes queue
            updateQueueRef.current.deletes.push(updatedTask.id);
            debouncedBatchUpdate();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          const deletedTaskId = (payload.old as Task).id;
          // Add to batch queue for deletes
          updateQueueRef.current.deletes.push(deletedTaskId);
          debouncedBatchUpdate();
          callbacksRef.current.onTaskDeleted?.(deletedTaskId);
        }
      )
      .subscribe();

    loadTasks();

    // Periodic access verification (every 15 minutes)
    const accessCheckInterval = setInterval(async () => {
      const hasAccess = await verifyAccess();

      if (!hasAccess) {
        // Access revoked - disconnect and clear data
        if (channel) {
          supabase.removeChannel(channel);
        }
        clearInterval(accessCheckInterval);
        setTasks([]);
        setError(new Error('Access to this space has been revoked'));
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Cleanup subscription, interval, and debounce timer on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (accessCheckInterval) {
        clearInterval(accessCheckInterval);
      }
      debouncedBatchUpdateRef.current?.cancel();
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    };
  }, [spaceId]); // Only spaceId triggers teardown/rebuild

  function refreshTasks() {
    setLoading(true);
    loadDataRef.current?.();
  }

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    setTasks, // Expose for optimistic updates
  };
}

// Separate hook for subtask real-time updates
export function useSubtaskRealtime(taskId: string) {
  const [subtasks, setSubtasks] = useState<SubtaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadSubtasks() {
      try {
        const { data, error } = await supabase
          .from('task_subtasks')
          .select(`
            id,
            title,
            completed,
            sort_order,
            parent_task_id,
            created_at,
            updated_at
          `)
          .eq('parent_task_id', taskId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setSubtasks(data || []);
      } catch (err) {
        logger.error('Error loading subtasks:', err, { component: 'hook-useTaskRealtime', action: 'hook_execution' });
      } finally {
        setLoading(false);
      }
    }

    const channel = supabase
      .channel(`subtasks:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_subtasks',
          filter: `parent_task_id=eq.${taskId}`,
        },
        () => {
          loadSubtasks();
        }
      )
      .subscribe();

    loadSubtasks();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return { subtasks, loading, setSubtasks };
}

// Hook for task comments real-time updates
export function useCommentsRealtime(taskId: string) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadComments() {
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select(`
            id,
            content,
            user_id,
            task_id,
            created_at,
            updated_at
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        logger.error('Error loading comments:', err, { component: 'hook-useTaskRealtime', action: 'hook_execution' });
      } finally {
        setLoading(false);
      }
    }

    const channel = supabase
      .channel(`comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    loadComments();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return { comments, loading, setComments };
}
