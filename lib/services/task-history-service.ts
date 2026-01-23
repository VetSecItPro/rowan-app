import { createClient } from '@/lib/supabase/client';

export const taskHistoryService = {
  async getTaskHistory(taskId: string): Promise<Array<Record<string, unknown>>> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_task_history', { p_task_id: taskId });
    if (error) throw error;
    return data || [];
  },

  async getActivityLog(taskId: string): Promise<Array<{ id: string; task_id: string; action: string; changes?: Record<string, unknown>; user?: Record<string, unknown>; created_at: string }>> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_activity_log').select('*, user:user_id(*)').eq('task_id', taskId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
