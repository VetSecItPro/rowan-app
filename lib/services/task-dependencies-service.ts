import { createClient } from '@/lib/supabase/client';

/**
 * Task Dependencies Service
 *
 * Manages relationships between tasks, enabling dependency tracking
 * and task blocking functionality. Supports both blocking dependencies
 * (task A must complete before task B) and relation links (related tasks).
 *
 * @module taskDependenciesService
 */

type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: 'blocks' | 'relates_to';
  created_at?: string;
  dependent_task?: Record<string, unknown>;
  depends_on_task?: Record<string, unknown>;
};

/** Service for managing task dependency relationships (blocking and related-to links). */
export const taskDependenciesService = {
  /**
   * Creates a dependency relationship between two tasks.
   * @param taskId - The ID of the task that has the dependency
   * @param dependsOnTaskId - The ID of the task that must complete first
   * @param userId - The ID of the user creating the dependency
   * @param type - The dependency type: 'blocks' (default) or 'relates_to'
   * @returns The created dependency record
   * @throws Error if the database insert fails
   */
  async addDependency(taskId: string, dependsOnTaskId: string, userId: string, type: 'blocks' | 'relates_to' = 'blocks'): Promise<TaskDependency> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').insert({
      task_id: taskId, depends_on_task_id: dependsOnTaskId, dependency_type: type, created_by: userId
    }).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Retrieves all dependencies for a task (tasks this task depends on).
   * @param taskId - The ID of the task to get dependencies for
   * @returns Array of dependency records with the depends_on task data populated
   * @throws Error if the database query fails
   */
  async getDependencies(taskId: string): Promise<TaskDependency[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').select('*, depends_on:depends_on_task_id(*)').eq('task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves all tasks that are blocked by a specific task.
   * @param taskId - The ID of the blocking task
   * @returns Array of dependency records with the blocked task data populated
   * @throws Error if the database query fails
   */
  async getBlockedBy(taskId: string): Promise<TaskDependency[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_dependencies').select('*, task:task_id(*)').eq('depends_on_task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  /**
   * Removes a dependency relationship between tasks.
   * @param dependencyId - The ID of the dependency record to remove
   * @throws Error if the database delete fails
   */
  async removeDependency(dependencyId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);
    if (error) throw error;
  },
};
