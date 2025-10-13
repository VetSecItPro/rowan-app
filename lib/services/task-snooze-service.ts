import { createClient } from '@/lib/supabase/client';

export const taskSnoozeService = {
  async snoozeTask(taskId: string, snoozedUntil: string, userId: string, reason?: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.from('tasks').update({
      is_snoozed: true, snoozed_until: snoozedUntil, snoozed_by: userId
    }).eq('id', taskId).select().single();
    if (error) throw error;
    return data;
  },

  async unsnoozeTask(taskId: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.from('tasks').update({
      is_snoozed: false, snoozed_until: null, snoozed_by: null
    }).eq('id', taskId).select().single();
    if (error) throw error;
    return data;
  },

  async getSnoozeHistory(taskId: string): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_snooze_history').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async autoUnsnoozeExpired(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('auto_unsnooze_expired_tasks');
  },
};
