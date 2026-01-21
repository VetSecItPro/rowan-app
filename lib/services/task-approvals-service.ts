import { createClient } from '@/lib/supabase/client';

type TaskApproval = {
  id: string;
  task_id: string;
  approver_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  review_note?: string | null;
  changes_requested?: string | null;
  created_at?: string;
  updated_at?: string;
  approver?: Record<string, unknown>;
  task?: Record<string, unknown>;
};

export const taskApprovalsService = {
  async requestApproval(taskId: string, approverId: string, requestedBy: string): Promise<TaskApproval> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_approvals').insert({
      task_id: taskId, approver_id: approverId, requested_by: requestedBy
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getApprovals(taskId: string): Promise<TaskApproval[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_approvals').select('*, approver:approver_id(*)').eq('task_id', taskId);
    if (error) throw error;
    return data || [];
  },

  async updateApprovalStatus(approvalId: string, status: 'approved' | 'rejected' | 'changes_requested', note?: string, changesRequested?: string): Promise<TaskApproval> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_approvals').update({
      status, review_note: note, changes_requested: changesRequested
    }).eq('id', approvalId).select().single();
    if (error) throw error;
    return data;
  },

  async getPendingApprovals(userId: string): Promise<TaskApproval[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('task_approvals').select('*, task:task_id(*)').eq('approver_id', userId).eq('status', 'pending');
    if (error) throw error;
    return data || [];
  },
};
