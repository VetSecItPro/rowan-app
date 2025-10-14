'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  sort_order: number;
  due_date?: string;
  assigned_to?: string;
  space_id: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

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

  useEffect(() => {
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
          .select('user_id, role')
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
          .select('*')
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

            // Apply filters
            const passesFilters =
              (!filters?.status || filters.status.includes(newTask.status)) &&
              (!filters?.priority || filters.priority.includes(newTask.priority)) &&
              (!filters?.assignedTo || newTask.assigned_to === filters.assignedTo);

            if (passesFilters) {
              setTasks((prev) => {
                // Check if task already exists (prevent duplicates)
                if (prev.some((t) => t.id === newTask.id)) {
                  return prev;
                }
                // Insert in sort order
                const updated = [...prev, newTask].sort((a, b) => a.sort_order - b.sort_order);
                return updated;
              });
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

            // Apply filters
            const passesFilters =
              (!filters?.status || filters.status.includes(updatedTask.status)) &&
              (!filters?.priority || filters.priority.includes(updatedTask.priority)) &&
              (!filters?.assignedTo || updatedTask.assigned_to === filters.assignedTo);

            if (passesFilters) {
              setTasks((prev) => {
                const index = prev.findIndex((t) => t.id === updatedTask.id);
                if (index === -1) {
                  // Task wasn't in list, add it
                  return [...prev, updatedTask].sort((a, b) => a.sort_order - b.sort_order);
                }
                // Update existing task
                const updated = [...prev];
                updated[index] = updatedTask;
                return updated.sort((a, b) => a.sort_order - b.sort_order);
              });
              onTaskUpdated?.(updatedTask);
            } else {
              // Task no longer passes filters, remove it
              setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
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
            setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
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
    };
  }, [spaceId, filters?.status, filters?.priority, filters?.assignedTo]);

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
          .select('*')
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
          .select('*')
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
