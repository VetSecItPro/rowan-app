import { createClient } from '@/lib/supabase/client';

export const taskHandoffService = {
  async handoffTask(taskId: string, toUserId: string, performedBy: string, note?: string, reason?: string): Promise<any> {
    const supabase = createClient();
    const { data: task } = await supabase.from('tasks').select('assigned_to').eq('id', taskId).single();

    await supabase.from('tasks').update({ assigned_to: toUserId }).eq('id', taskId);

    const { data, error } = await supabase.from('task_handoffs').insert({
      task_id: taskId,
      from_user_id: task?.assigned_to,
      to_user_id: toUserId,
      handoff_note: note,
      reason,
      performed_by: performedBy,
    }).select().single();

    if (error) throw error;
    return data;
  },

  async getHandoffHistory(taskId: string): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_handoffs')
      .select('*, from_user:from_user_id(*), to_user:to_user_id(*)')
      .eq('task_id', taskId)
      .order('performed_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
};
