import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Subtasks Service
 *
 * Manages subtasks for breaking down complex tasks into smaller steps.
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
   * Get all subtasks for a parent task
   */
  async getSubtasks(parentTaskId: string): Promise<Subtask[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
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
   * Create a new subtask
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
   * Update a subtask
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
   * Delete a subtask
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
   * Reorder subtasks
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
   * Get subtask completion percentage for a parent task
   */
  async getCompletionPercentage(parentTaskId: string): Promise<number> {
    const subtasks = await this.getSubtasks(parentTaskId);
    if (subtasks.length === 0) return 0;

    const completed = subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completed / subtasks.length) * 100);
  },
};
