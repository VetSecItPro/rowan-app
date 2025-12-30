import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { enhancedNotificationService } from './enhanced-notification-service';
import { sanitizeSearchInput } from '@/lib/utils';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task-schemas';
import type {
  Task,
  TaskStats,
  TaskQueryOptions,
  PaginatedResponse,
} from '@/lib/types';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Security: Default maximum limit for list queries to prevent unbounded data retrieval
 * This protects against DoS attacks and ensures predictable API response sizes
 */
const DEFAULT_MAX_LIMIT = 500;

/**
 * Tasks Service
 *
 * Comprehensive service for managing tasks with full CRUD operations,
 * real-time subscriptions, filtering, and statistics.
 *
 * Features:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Advanced filtering and sorting
 * - Pagination support
 * - Real-time subscriptions
 * - Batch operations
 * - Task statistics
 * - Automatic completion timestamp handling
 */
export const tasksService = {
  /**
   * Get all tasks for a space with optional filtering and sorting
   *
   * @param spaceId - The space ID to fetch tasks from
   * @param options - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise<Task[]> - Array of tasks
   *
   * @example
   * ```typescript
   * // Get all tasks
   * const tasks = await tasksService.getTasks(spaceId);
   *
   * // Get only pending tasks
   * const pending = await tasksService.getTasks(spaceId, { status: 'pending' });
   *
   * // Get high priority tasks sorted by due date
   * const urgent = await tasksService.getTasks(spaceId, {
   *   priority: 'high',
   *   sort: 'due_date',
   *   order: 'asc'
   * });
   * ```
   */
  async getTasks(spaceId: string, options?: TaskQueryOptions): Promise<Task[]> {
    const supabase = createClient();
    try {
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
          space_id,
          completed_at,
          estimated_hours,
          quick_note,
          tags,
          calendar_sync
        `)
        .eq('space_id', spaceId);

      // Apply filters
      if (options?.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      if (options?.priority) {
        if (Array.isArray(options.priority)) {
          query = query.in('priority', options.priority);
        } else {
          query = query.eq('priority', options.priority);
        }
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.assigned_to) {
        query = query.eq('assigned_to', options.assigned_to);
      }

      if (options?.created_by) {
        query = query.eq('created_by', options.created_by);
      }

      // Search in title and description (sanitized to prevent SQL injection)
      if (options?.search) {
        const sanitizedSearch = sanitizeSearchInput(options.search);
        if (sanitizedSearch) {
          query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
        }
      }

      // Apply sorting
      const sortField = options?.sort || 'created_at';
      const sortOrder = options?.order === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortField, sortOrder);

      // Apply pagination with enforced maximum limit for security
      // SECURITY: Always apply a limit to prevent unbounded queries
      const effectiveLimit = Math.min(options?.limit || DEFAULT_MAX_LIMIT, DEFAULT_MAX_LIMIT);
      query = query.limit(effectiveLimit);

      if (options?.offset) {
        query = query.range(options.offset, options.offset + effectiveLimit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getTasks', error, {
        component: 'tasksService',
        action: 'getTasks',
        spaceId,
      });
      throw error;
    }
  },

  /**
   * Get paginated tasks with total count
   *
   * @param spaceId - The space ID to fetch tasks from
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @param options - Optional query parameters for filtering and sorting
   * @returns Promise<PaginatedResponse<Task>> - Paginated response with tasks and metadata
   *
   * @example
   * ```typescript
   * const result = await tasksService.getTasksPaginated(spaceId, 1, 20, {
   *   status: 'pending',
   *   sort: 'due_date'
   * });
   * console.log(result.data); // Tasks array
   * console.log(result.total); // Total count
   * console.log(result.hasMore); // Whether there are more pages
   * ```
   */
  async getTasksPaginated(
    spaceId: string,
    page: number = 1,
    limit: number = 20,
    options?: TaskQueryOptions
  ): Promise<PaginatedResponse<Task>> {
    const supabase = createClient();
    try {
      const offset = (page - 1) * limit;

      // Get total count
      let countQuery = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('space_id', spaceId);

      // Apply same filters for count
      if (options?.status) {
        if (Array.isArray(options.status)) {
          countQuery = countQuery.in('status', options.status);
        } else {
          countQuery = countQuery.eq('status', options.status);
        }
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to get task count: ${countError.message}`);
      }

      // Get paginated data
      const data = await this.getTasks(spaceId, {
        ...options,
        limit,
        offset,
      });

      const total = count || 0;
      const hasMore = offset + limit < total;

      return {
        data,
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      logger.error('Error in getTasksPaginated', error, {
        component: 'tasksService',
        action: 'getTasksPaginated',
      });
      throw error;
    }
  },

  /**
   * Get a single task by ID
   *
   * @param id - Task ID
   * @returns Promise<Task | null> - Task or null if not found
   *
   * @example
   * ```typescript
   * const task = await tasksService.getTaskById('123-456-789');
   * if (task) {
   *   console.log(task.title);
   * }
   * ```
   */
  async getTaskById(id: string): Promise<Task | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Error in getTaskById', error, { component: 'tasksService', action: 'getTaskById' });
      throw error;
    }
  },

  /**
   * Create a new task
   *
   * @param data - Task creation data
   * @returns Promise<Task> - Created task
   *
   * @example
   * ```typescript
   * const newTask = await tasksService.createTask({
   *   space_id: '123',
   *   title: 'Complete project',
   *   description: 'Finish the MVP',
   *   priority: 'high',
   *   due_date: '2025-10-10',
   *   assigned_to: 'user-id'
   * });
   * ```
   */
  async createTask(data: CreateTaskInput): Promise<Task> {
    const supabase = createClient();
    try {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      // Send task assignment notifications if task is assigned to someone
      if (task.assigned_to && task.space_id) {
        try {
          // Get current user, assigned user, and space info for notifications
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const [{ data: creatorData }, { data: assigneeData }, { data: spaceData }] = await Promise.all([
              supabase.from('users').select('name').eq('id', user.id).single(),
              supabase.from('users').select('name').eq('id', task.assigned_to).single(),
              supabase.from('spaces').select('name').eq('id', task.space_id).single()
            ]);

            // Only send notification if task is assigned to someone other than the creator
            if (task.assigned_to !== user.id) {
              enhancedNotificationService.sendTaskAssignmentNotification(
                [task.assigned_to],
                {
                  taskTitle: task.title,
                  taskUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}?space_id=${task.space_id}`,
                  assignedBy: creatorData?.name || 'Someone',
                  assignedTo: assigneeData?.name || 'You',
                  priority: task.priority || 'medium',
                  dueDate: task.due_date,
                  spaceName: spaceData?.name || 'Your Space',
                  description: task.description,
                }
              ).catch((error) => logger.error('Caught error', error, { component: 'lib-tasks-service', action: 'service_call' }));
            }
          }
        } catch (error) {
          logger.error('Failed to send task assignment notification:', error, { component: 'lib-tasks-service', action: 'service_call' });
          // Don't throw here - task creation should succeed even if notification fails
        }
      }

      return task;
    } catch (error) {
      logger.error('Error in createTask', error, { component: 'tasksService', action: 'createTask' });
      throw error;
    }
  },

  /**
   * Create multiple tasks in a single operation
   *
   * @param tasks - Array of task creation data
   * @returns Promise<Task[]> - Created tasks
   *
   * @example
   * ```typescript
   * const tasks = await tasksService.createTasksBatch([
   *   { space_id: '123', title: 'Task 1', priority: 'high' },
   *   { space_id: '123', title: 'Task 2', priority: 'medium' },
   * ]);
   * ```
   */
  async createTasksBatch(tasks: CreateTaskInput[]): Promise<Task[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(tasks)
        .select();

      if (error) {
        throw new Error(`Failed to create tasks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in createTasksBatch', error, { component: 'tasksService', action: 'createTasksBatch' });
      throw error;
    }
  },

  /**
   * Update a task
   *
   * Automatically sets completed_at timestamp when status is changed to 'completed'
   *
   * @param id - Task ID
   * @param updates - Partial task data to update
   * @returns Promise<Task> - Updated task
   *
   * @example
   * ```typescript
   * const updated = await tasksService.updateTask('task-id', {
   *   status: 'completed',
   *   priority: 'low'
   * });
   * ```
   */
  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
    const supabase = createClient();
    try {
      // If marking as completed, set completed_at timestamp
      const finalUpdates: any = { ...updates };
      if (updates.status === 'completed' && !finalUpdates.completed_at) {
        finalUpdates.completed_at = new Date().toISOString();
      }

      // If changing from completed to another status, clear completed_at
      if (updates.status && updates.status !== 'completed') {
        finalUpdates.completed_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      return data;
    } catch (error) {
      logger.error('Error in updateTask', error, { component: 'tasksService', action: 'updateTask' });
      throw error;
    }
  },

  /**
   * Update multiple tasks with the same changes
   *
   * @param ids - Array of task IDs
   * @param updates - Updates to apply to all tasks
   * @returns Promise<Task[]> - Updated tasks
   *
   * @example
   * ```typescript
   * const updated = await tasksService.updateTasksBatch(
   *   ['id-1', 'id-2', 'id-3'],
   *   { priority: 'urgent' }
   * );
   * ```
   */
  async updateTasksBatch(ids: string[], updates: UpdateTaskInput): Promise<Task[]> {
    const supabase = createClient();
    try {
      const finalUpdates: any = { ...updates };
      if (updates.status === 'completed' && !finalUpdates.completed_at) {
        finalUpdates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .in('id', ids)
        .select();

      if (error) {
        throw new Error(`Failed to update tasks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in updateTasksBatch', error, { component: 'tasksService', action: 'updateTasksBatch' });
      throw error;
    }
  },

  /**
   * Delete a task
   *
   * @param id - Task ID
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await tasksService.deleteTask('task-id');
   * ```
   */
  async deleteTask(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete task: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error in deleteTask', error, { component: 'tasksService', action: 'deleteTask' });
      throw error;
    }
  },

  /**
   * Delete multiple tasks
   *
   * @param ids - Array of task IDs to delete
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await tasksService.deleteTasksBatch(['id-1', 'id-2', 'id-3']);
   * ```
   */
  async deleteTasksBatch(ids: string[]): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', ids);

      if (error) {
        throw new Error(`Failed to delete tasks: ${error.message}`);
      }
    } catch (error) {
      logger.error('Error in deleteTasksBatch', error, { component: 'tasksService', action: 'deleteTasksBatch' });
      throw error;
    }
  },

  /**
   * Get comprehensive task statistics for a space
   *
   * Uses a database RPC function for efficient server-side aggregation,
   * avoiding fetching all tasks to the client.
   *
   * @param spaceId - Space ID
   * @returns Promise<TaskStats> - Task statistics including totals and breakdowns
   *
   * @example
   * ```typescript
   * const stats = await tasksService.getTaskStats(spaceId);
   * logger.info(`Total: ${stats.total}`, { component: 'lib-tasks-service' });
   * logger.info(`Completed: ${stats.completed}`, { component: 'lib-tasks-service' });
   * logger.info(`High Priority: ${stats.byPriority.high}`, { component: 'lib-tasks-service' });
   * ```
   */
  async getTaskStats(spaceId: string): Promise<TaskStats> {
    return cacheAside(
      cacheKeys.taskStats(spaceId),
      async () => {
        const supabase = createClient();
        try {
          // Use RPC for efficient server-side aggregation
          const { data, error } = await supabase
            .rpc('get_task_stats', { p_space_id: spaceId });

          if (error) {
            throw new Error(`Failed to get task stats: ${error.message}`);
          }

          // RPC returns the stats object directly
          return {
            total: data?.total ?? 0,
            completed: data?.completed ?? 0,
            inProgress: data?.inProgress ?? 0,
            pending: data?.pending ?? 0,
            blocked: data?.blocked ?? 0,
            onHold: data?.onHold ?? 0,
            byPriority: {
              low: data?.byPriority?.low ?? 0,
              medium: data?.byPriority?.medium ?? 0,
              high: data?.byPriority?.high ?? 0,
              urgent: data?.byPriority?.urgent ?? 0,
            },
          };
        } catch (error) {
          logger.error('Error in getTaskStats', error, { component: 'tasksService', action: 'getTaskStats' });
          throw error;
        }
      },
      CACHE_TTL.SHORT // 1 minute - stats change frequently
    );
  },

  /**
   * Subscribe to real-time task changes for a space
   *
   * @param spaceId - Space ID to subscribe to
   * @param callback - Callback function called when tasks change
   * @returns RealtimeChannel - Channel object with unsubscribe method
   *
   * @example
   * ```typescript
   * const channel = tasksService.subscribeToTasks(spaceId, (payload) => {
   *   logger.info('Change:', { component: 'lib-tasks-service', data: payload.eventType });
   *   logger.info('Task:', { component: 'lib-tasks-service', data: payload.new || payload.old });
   * });
   *
   * // Later, cleanup
   * channel.unsubscribe();
   * ```
   */
  subscribeToTasks(
    spaceId: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Task | null;
      old: Task | null;
    }) => void
  ): RealtimeChannel {
    const supabase = createClient();
    return supabase
      .channel(`tasks:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          callback({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Task | null,
            old: payload.old as Task | null,
          });
        }
      )
      .subscribe();
  },

  /**
   * Get tasks assigned to a specific user
   *
   * @param spaceId - Space ID
   * @param userId - User ID
   * @returns Promise<Task[]> - Tasks assigned to user
   *
   * @example
   * ```typescript
   * const myTasks = await tasksService.getTasksByUser(spaceId, userId);
   * ```
   */
  async getTasksByUser(spaceId: string, userId: string): Promise<Task[]> {
    const supabase = createClient();
    return this.getTasks(spaceId, { assigned_to: userId });
  },

  /**
   * Get tasks due within a date range
   *
   * @param spaceId - Space ID
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @returns Promise<Task[]> - Tasks due in range
   *
   * @example
   * ```typescript
   * const thisWeek = await tasksService.getTasksByDueDate(
   *   spaceId,
   *   '2025-10-05',
   *   '2025-10-12'
   * );
   * ```
   */
  async getTasksByDueDate(spaceId: string, startDate: string, endDate: string): Promise<Task[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('space_id', spaceId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch tasks by due date: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getTasksByDueDate', error, { component: 'tasksService', action: 'getTasksByDueDate' });
      throw error;
    }
  },

  /**
   * Get overdue tasks
   *
   * @param spaceId - Space ID
   * @returns Promise<Task[]> - Overdue tasks that are not completed
   *
   * @example
   * ```typescript
   * const overdue = await tasksService.getOverdueTasks(spaceId);
   * ```
   */
  async getOverdueTasks(spaceId: string): Promise<Task[]> {
    const supabase = createClient();
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('space_id', spaceId)
        .lt('due_date', today)
        .neq('status', 'completed')
        .order('due_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch overdue tasks: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getOverdueTasks', error, { component: 'tasksService', action: 'getOverdueTasks' });
      throw error;
    }
  },
};
