import { createClient } from '@/lib/supabase/client';

export const quickActionsService = {
  async trackAction(spaceId: string, userId: string, actionType: string, context?: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('quick_action_usage').insert({
      space_id: spaceId,
      user_id: userId,
      action_type: actionType,
      context,
    });
  },

  async getTopActions(spaceId: string, userId: string, limit: number = 5): Promise<Array<{ action_type: string; usage_count: number }>> {
    const supabase = createClient();
    const { data, error } = await supabase.from('quick_action_stats')
      .select('action_type, usage_count')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async refreshStats(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('refresh_quick_action_stats');
  },

  async cleanupOldUsage(): Promise<void> {
    const supabase = createClient();
    await supabase.rpc('cleanup_old_quick_action_usage');
  },
};
