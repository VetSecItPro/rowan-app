import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Task Time Tracking Service
 *
 * Manages time entries for tasks with start/stop timer and manual entry support.
 */

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in minutes
  notes?: string;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeEntryInput {
  task_id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  notes?: string;
  is_manual?: boolean;
}

export const taskTimeTrackingService = {
  /**
   * Get all time entries for a task
   */
  async getTimeEntries(taskId: string): Promise<TimeEntry[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('id, task_id, user_id, start_time, end_time, duration, notes, is_manual, created_at, updated_at')
        .eq('task_id', taskId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching time entries:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Start a timer for a task
   */
  async startTimer(taskId: string, userId: string, notes?: string): Promise<TimeEntry> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: userId,
          start_time: new Date().toISOString(),
          notes,
          is_manual: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error starting timer:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Stop a running timer
   */
  async stopTimer(entryId: string): Promise<TimeEntry> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error stopping timer:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get active timer for a user
   */
  async getActiveTimer(userId: string): Promise<TimeEntry | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('id, task_id, user_id, start_time, end_time, duration, notes, is_manual, created_at, updated_at')
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    } catch (error) {
      logger.error('Error fetching active timer:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Manually add a time entry
   */
  async addManualEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .insert({
          ...input,
          is_manual: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error adding manual entry:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Update a time entry
   */
  async updateEntry(entryId: string, updates: Partial<CreateTimeEntryInput>): Promise<TimeEntry> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .update(updates)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating entry:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Delete a time entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('task_time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting entry:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get total time tracked for a task
   */
  async getTotalDuration(taskId: string): Promise<number> {
    const entries = await this.getTimeEntries(taskId);
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0);
  },

  /**
   * Get time entries for a user within a date range
   */
  async getUserTimeEntries(userId: string, startDate: string, endDate: string): Promise<TimeEntry[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_time_entries')
        .select('id, task_id, user_id, start_time, end_time, duration, notes, is_manual, created_at, updated_at')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching user time entries:', error, { component: 'lib-task-time-tracking-service', action: 'service_call' });
      throw error;
    }
  },
};
