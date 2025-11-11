'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Task } from '@/lib/types';

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

// Optimized filter function
function taskPassesFilters(task: Task, filters?: UseTaskRealtimeOptions['filters']): boolean {
  if (!filters) return true;

  return (
    (!filters.status || filters.status.includes(task.status)) &&
    (!filters.priority || filters.priority.includes(task.priority)) &&
    (!filters.assignedTo || task.assigned_to === filters.assignedTo)
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

  // Performance optimizations
  const updateQueueRef = useRef<{
    inserts: Task[];
    updates: Task[];
    deletes: string[];
  }>({ inserts: [], updates: [], deletes: [] });

  // Memoized filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters?.status?.join(','),
    filters?.priority?.join(','),
    filters?.assignedTo
  ]);

  // Memoized filter function to avoid recalculation
  const taskFilter = useCallback((task: Task) => taskPassesFilters(task, memoizedFilters), [memoizedFilters]);

  // Debounced batch update function - use useRef to avoid recreation
  const debouncedBatchUpdateRef = useRef<(() => void) | null>(null);

  if (!debouncedBatchUpdateRef.current) {
    debouncedBatchUpdateRef.current = debounce(() => {
      const queue = updateQueueRef.current;
      if (queue.inserts.length === 0 && queue.updates.length === 0 && queue.deletes.length === 0) {
        return;
      }

      setTasks(prev => {
        let result = [...prev];

        // Process deletes first
        if (queue.deletes.length > 0) {
          const deleteSet = new Set(queue.deletes);
          result = result.filter(task => !deleteSet.has(task.id));
        }

        // Process updates
        if (queue.updates.length > 0) {
          const updateMap = new Map(queue.updates.map(task => [task.id, task]));
          result = result.map(task => updateMap.get(task.id) || task);
        }

        // Process inserts
        if (queue.inserts.length > 0) {
          const existingIds = new Set(result.map(task => task.id));
          const newTasks = queue.inserts.filter(task => !existingIds.has(task.id));
          result = [...result, ...newTasks];
        }

        // Sort once at the end (provide defaults for undefined sort_order)
        return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });

      // Clear the queue
      updateQueueRef.current = { inserts: [], updates: [], deletes: [] };
    }, 50); // 50ms debounce for smooth updates
  }

  const debouncedBatchUpdate = debouncedBatchUpdateRef.current;

  useEffect(() => {
    // Guard against invalid spaceId to prevent empty query parameters
    if (!spaceId || spaceId.trim() === '' || spaceId === 'undefined' || spaceId === 'null' || spaceId === 'placeholder' || spaceId === 'skip') {
      setTasks([]);
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return false;
        }

        const { data: membership, error: memberError } = await supabase
          .from('space_members')
          .select('user_id')
          .eq('space_id', spaceId)
          .eq('user_id', user.id)
          .single();

        return !memberError && !!membership;
      } catch (err) {
        return false;
      }
    }

    async function loadTasks() {
      try {
        // Verify access before loading
        const hasAccess = await verifyAccess();
        if (!hasAccess) {
          setError(new Error('You do not have access to this space'));
          setLoading(false);
          return;
        }

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

        // Apply filters
        if (filters?.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters?.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }
        if (filters?.assignedTo) {
          query = query.eq('assigned_to', filters.assignedTo);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setTasks(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    function setupRealtimeSubscription() {
      channel = supabase
        .channel(`tasks:${spaceId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tasks',
            filter: `space_id=eq.${spaceId}`,
          },
          (payload) => {
            const newTask = payload.new as Task;

            if (taskFilter(newTask)) {
              // Add to batch queue instead of immediate state update
              updateQueueRef.current.inserts.push(newTask);
              debouncedBatchUpdate();
              onTaskAdded?.(newTask);
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
          (payload) => {
            const updatedTask = payload.new as Task;

            if (taskFilter(updatedTask)) {
              // Add to batch queue for updates
              updateQueueRef.current.updates.push(updatedTask);
              debouncedBatchUpdate();
              onTaskUpdated?.(updatedTask);
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
          (payload) => {
            const deletedTaskId = (payload.old as Task).id;
            // Add to batch queue for deletes
            updateQueueRef.current.deletes.push(deletedTaskId);
            debouncedBatchUpdate();
            onTaskDeleted?.(deletedTaskId);
          }
        )
        .subscribe();
    }

    loadTasks();
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
        setTasks([]);
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

  function refreshTasks() {
    setLoading(true);
    // Trigger re-fetch by updating a dependency
    // The useEffect will handle the actual fetch
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
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

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
        console.error('Error loading subtasks:', err);
      } finally {
        setLoading(false);
      }
    }

    channel = supabase
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
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

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
        console.error('Error loading comments:', err);
      } finally {
        setLoading(false);
      }
    }

    channel = supabase
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
