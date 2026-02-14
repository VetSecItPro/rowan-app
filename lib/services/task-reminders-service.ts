import { createClient } from '@/lib/supabase/client';

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: string;
  reminder_type: 'notification' | 'email' | 'both';
  offset_type: 'at_due_time' | '15_min_before' | '1_hour_before' | '1_day_before' | '1_week_before' | 'custom';
  custom_offset_minutes?: number;
  is_sent: boolean;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Service for creating and managing task-specific reminders with configurable time offsets. */
export const taskRemindersService = {
  async createReminder(taskId: string, userId: string, offsetType: string, reminderType: string = 'notification', customOffset?: number): Promise<TaskReminder> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_reminders').insert({
      task_id: taskId, user_id: userId, offset_type: offsetType, reminder_type: reminderType,
      custom_offset_minutes: customOffset, created_by: userId,
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getTaskReminders(taskId: string): Promise<TaskReminder[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_reminders').select('id, task_id, user_id, remind_at, reminder_type, offset_type, custom_offset_minutes, is_sent, sent_at, created_by, created_at, updated_at').eq('task_id', taskId).order('remind_at');
    if (error) throw error;
    return data || [];
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('task_reminders').delete().eq('id', reminderId);
    if (error) throw error;
  },

  async getPendingReminders(): Promise<Array<{ id: string; task_id: string; reminder_time: string; sent: boolean }>> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_pending_reminders');
    if (error) throw error;
    return data || [];
  },

  async markReminderSent(reminderId: string): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('mark_reminder_sent', { reminder_id: reminderId });
  },
};
