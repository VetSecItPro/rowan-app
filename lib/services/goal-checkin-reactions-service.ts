import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface CheckInReaction {
  id: string;
  check_in_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  users?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export const goalCheckInReactionsService = {
  /**
   * Verify that a goal check-in exists.
   */
  async checkInExists(checkInId: string): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('goal_check_ins')
      .select('id')
      .eq('id', checkInId)
      .limit(1);

    if (error) {
      logger.error('[goal-checkin-reactions] checkInExists error:', error, {
        component: 'lib-goal-checkin-reactions-service',
        action: 'service_call',
      });
      return false;
    }

    return (data?.length ?? 0) > 0;
  },

  /**
   * Get all reactions for a check-in.
   */
  async getReactions(checkInId: string): Promise<CheckInReaction[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('goal_check_in_reactions')
        .select(`
          id, check_in_id, user_id, emoji, created_at,
          users!goal_check_in_reactions_user_id_fkey(id, email, full_name, avatar_url)
        `)
        .eq('check_in_id', checkInId);

      if (error) {
        // Table might not exist yet
        logger.info('[goal-checkin-reactions] Reactions table not available:', {
          component: 'lib-goal-checkin-reactions-service',
          data: error.message,
        });
        return [];
      }

      return (data || []) as CheckInReaction[];
    } catch (error) {
      logger.error('[goal-checkin-reactions] getReactions error:', error, {
        component: 'lib-goal-checkin-reactions-service',
        action: 'service_call',
      });
      return [];
    }
  },

  /**
   * Add a reaction to a check-in.
   */
  async addReaction(checkInId: string, userId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_check_in_reactions')
      .insert([{ check_in_id: checkInId, user_id: userId, emoji }]);

    if (error) {
      logger.error('[goal-checkin-reactions] addReaction error:', error, {
        component: 'lib-goal-checkin-reactions-service',
        action: 'service_call',
      });
      throw error;
    }
  },

  /**
   * Remove a reaction from a check-in.
   */
  async removeReaction(checkInId: string, userId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('goal_check_in_reactions')
      .delete()
      .eq('check_in_id', checkInId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) {
      logger.error('[goal-checkin-reactions] removeReaction error:', error, {
        component: 'lib-goal-checkin-reactions-service',
        action: 'service_call',
      });
      throw error;
    }
  },
};
