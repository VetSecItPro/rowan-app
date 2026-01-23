import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/lib/types';
import { logger } from '@/lib/logger';

/**
 * Task Recurrence Service
 *
 * Handles recurring task creation, management, and generation of task instances.
 */

export interface RecurrencePattern {
  pattern: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week?: number[]; // 0-6, Sunday=0
  day_of_month?: number; // 1-31
  month?: number; // 1-12
  end_date?: string;
  end_count?: number;
  exceptions?: string[]; // ISO date strings to skip
}

export interface RecurringTaskInput {
  space_id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  assigned_to?: string;
  created_by: string;
  recurrence: RecurrencePattern;
}

export const taskRecurrenceService = {
  /**
   * Create a recurring task template
   */
  async createRecurringTask(input: RecurringTaskInput): Promise<Task> {
    const supabase = createClient();
    try {
      const { recurrence, ...taskData } = input;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          is_recurring: true,
          is_recurrence_template: true,
          recurrence_pattern: recurrence.pattern,
          recurrence_interval: recurrence.interval,
          recurrence_days_of_week: recurrence.days_of_week || [],
          recurrence_day_of_month: recurrence.day_of_month,
          recurrence_month: recurrence.month,
          recurrence_end_date: recurrence.end_date,
          recurrence_end_count: recurrence.end_count,
          recurrence_exceptions: recurrence.exceptions || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating recurring task:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Generate next occurrence of a recurring task
   */
  async generateNextOccurrence(templateId: string, dueDate: string): Promise<Task> {
    const supabase = createClient();
    try {
      // Get template task
      const { data: template, error: templateError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create new task instance
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          space_id: template.space_id,
          title: template.title,
          description: template.description,
          category: template.category,
          priority: template.priority,
          status: 'pending',
          due_date: dueDate,
          assigned_to: template.assigned_to,
          created_by: template.created_by,
          is_recurring: true,
          parent_recurrence_id: templateId,
          is_recurrence_template: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error generating task occurrence:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get all recurring task templates for a space
   */
  async getRecurringTemplates(spaceId: string): Promise<Task[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_recurrence_template', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching recurring templates:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get all generated instances of a recurring task
   */
  async getTaskInstances(templateId: string): Promise<Task[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_recurrence_id', templateId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching task instances:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Update recurring task template
   */
  async updateRecurringTemplate(templateId: string, updates: Partial<RecurringTaskInput>): Promise<Task> {
    const supabase = createClient();
    try {
      const { recurrence, ...taskUpdates } = updates as RecurringTaskInput & { recurrence?: RecurrencePattern };

      const finalUpdates: Record<string, unknown> = { ...taskUpdates };

      if (recurrence) {
        finalUpdates.recurrence_pattern = recurrence.pattern;
        finalUpdates.recurrence_interval = recurrence.interval;
        finalUpdates.recurrence_days_of_week = recurrence.days_of_week || [];
        finalUpdates.recurrence_day_of_month = recurrence.day_of_month;
        finalUpdates.recurrence_month = recurrence.month;
        finalUpdates.recurrence_end_date = recurrence.end_date;
        finalUpdates.recurrence_end_count = recurrence.end_count;
        finalUpdates.recurrence_exceptions = recurrence.exceptions || [];
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(finalUpdates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating recurring template:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Delete recurring task and optionally all its instances
   */
  async deleteRecurring(templateId: string, deleteInstances: boolean = false): Promise<void> {
    const supabase = createClient();
    try {
      if (deleteInstances) {
        // Delete all instances first
        const { error: instancesError } = await supabase
          .from('tasks')
          .delete()
          .eq('parent_recurrence_id', templateId);

        if (instancesError) throw instancesError;
      }

      // Delete template
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting recurring task:', error, { component: 'lib-task-recurrence-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Calculate next due date based on recurrence pattern
   */
  calculateNextDueDate(lastDate: string, pattern: RecurrencePattern): string | null {
    const last = new Date(lastDate);
    let next: Date;

    switch (pattern.pattern) {
      case 'daily':
        next = new Date(last);
        next.setDate(last.getDate() + pattern.interval);
        break;

      case 'weekly':
        next = new Date(last);
        next.setDate(last.getDate() + (7 * pattern.interval));
        break;

      case 'biweekly':
        next = new Date(last);
        next.setDate(last.getDate() + (14 * pattern.interval)); // 2 weeks
        break;

      case 'monthly':
        next = new Date(last);
        next.setMonth(last.getMonth() + pattern.interval);
        // Handle day of month
        if (pattern.day_of_month) {
          next.setDate(Math.min(pattern.day_of_month, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        }
        break;

      case 'yearly':
        next = new Date(last);
        next.setFullYear(last.getFullYear() + pattern.interval);
        if (pattern.month) {
          next.setMonth(pattern.month - 1);
        }
        if (pattern.day_of_month) {
          next.setDate(pattern.day_of_month);
        }
        break;

      default:
        return null;
    }

    // Check end conditions
    if (pattern.end_date && next > new Date(pattern.end_date)) {
      return null;
    }

    // Check exceptions
    const nextDateStr = next.toISOString().split('T')[0];
    if (pattern.exceptions && pattern.exceptions.includes(nextDateStr)) {
      // Skip this date and calculate next
      return this.calculateNextDueDate(nextDateStr, pattern);
    }

    return nextDateStr;
  },
};
