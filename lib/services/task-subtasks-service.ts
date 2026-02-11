import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Subtasks Service
 *
 * Manages subtasks for breaking down complex tasks into smaller steps.
 * Provides CRUD operations for subtasks with automatic completion tracking
 * and sort order management.
 *
 * @module taskSubtasksService
 */

export interface Subtask {
  id: string;
  parent_task_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sort_order: number;
  assigned_to?: string;
  due_date?: string;
  estimated_duration?: number;
  actual_duration?: number;
  completed_at?: string;
  completed_by?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubtaskInput {
  parent_task_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  sort_order?: number;
  assigned_to?: string;
  due_date?: string;
  estimated_duration?: number;
  created_by: string;
}

export const taskSubtasksService = {
  /**
   * Retrieves all subtasks for a parent task.
   * @param parentTaskId - The ID of the parent task
   * @returns Array of subtasks sorted by sort_order ascending
   * @throws Error if the database query fails
   */
  async getSubtasks(parentTaskId: string): Promise<Subtask[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('id, parent_task_id, title, description, status, priority, sort_order, assigned_to, due_date, estimated_duration, actual_duration, completed_at, completed_by, created_by, created_at, updated_at')
        .eq('parent_task_id', parentTaskId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching subtasks:', error, { component: 'lib-task-subtasks-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Creates a new subtask under a parent task.
   * @param input - Subtask creation data including parent_task_id and title
   * @returns The newly created subtask
   * @throws Error if the database insert fails
   */
  async createSubtask(input: CreateSubtaskInput): Promise<Subtask> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating subtask:', error, { component: 'lib-task-subtasks-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Updates a subtask with the provided changes.
   * Automatically sets completed_at timestamp when status changes to 'completed'.
   * @param subtaskId - The ID of the subtask to update
   * @param updates - Partial subtask data to apply
   * @returns The updated subtask
   * @throws Error if the database update fails
   */
  async updateSubtask(subtaskId: string, updates: Partial<CreateSubtaskInput>): Promise<Subtask> {
    const supabase = createClient();
    try {
      // If marking as completed, set completed_at
      const finalUpdates: Partial<CreateSubtaskInput> & { completed_at?: string | null } = { ...updates };
      if (updates.status === 'completed' && !finalUpdates.completed_at) {
        finalUpdates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('subtasks')
        .update(finalUpdates)
        .eq('id', subtaskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating subtask:', error, { component: 'lib-task-subtasks-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Permanently deletes a subtask.
   * @param subtaskId - The ID of the subtask to delete
   * @throws Error if the database delete fails
   */
  async deleteSubtask(subtaskId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting subtask:', error, { component: 'lib-task-subtasks-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Reorders subtasks by updating their sort_order based on array position.
   * Uses parallel updates for better performance.
   * @param subtaskIds - Array of subtask IDs in the desired order
   * @throws Error if any database update fails
   */
  async reorderSubtasks(subtaskIds: string[]): Promise<void> {
    const supabase = createClient();
    try {
      // PERF: Parallel sort_order updates instead of sequential — FIX-040
      await Promise.all(
        subtaskIds.map((id, index) =>
          supabase
            .from('subtasks')
            .update({ sort_order: index })
            .eq('id', id)
        )
      );
    } catch (error) {
      logger.error('Error reordering subtasks:', error, { component: 'lib-task-subtasks-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Calculates the completion percentage for a parent task's subtasks.
   * @param parentTaskId - The ID of the parent task
   * @returns Percentage (0-100) of completed subtasks, or 0 if no subtasks exist
   */
  async getCompletionPercentage(parentTaskId: string): Promise<number> {
    const subtasks = await this.getSubtasks(parentTaskId);
    if (subtasks.length === 0) return 0;

    const completed = subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completed / subtasks.length) * 100);
  },
};
