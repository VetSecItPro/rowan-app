import { createClient } from '@/lib/supabase/client';

export const taskAssignmentsService = {
  async getAssignments(taskId: string): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_assignments').select('*, user:user_id(*)').eq('task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  async assignUser(taskId: string, userId: string, role: 'assignee' | 'reviewer' | 'observer' = 'assignee', isPrimary: boolean = false, assignedBy?: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_assignments').insert({
      task_id: taskId, user_id: userId, role, is_primary: isPrimary, assigned_by: assignedBy
    }).select().single();
    if (error) throw error;
    return data;
  },

  async removeAssignment(assignmentId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('task_assignments').delete().eq('id', assignmentId);
    if (error) throw error;
  },

  async setPrimaryAssignee(taskId: string, userId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('task_assignments').update({ is_primary: false }).eq('task_id', taskId);
    await supabase.from('task_assignments').update({ is_primary: true }).eq('task_id', taskId).eq('user_id', userId);
  },
};
