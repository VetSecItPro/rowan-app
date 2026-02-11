import { createClient } from '@/lib/supabase/client';

export interface CheckInReaction {
  id: string;
  checkin_id: string;
  from_user_id: string;
  reaction_type: 'heart' | 'hug' | 'strength' | 'custom';
  message?: string;
  created_at: string;
}

export interface CreateReactionInput {
  checkin_id: string;
  reaction_type: 'heart' | 'hug' | 'strength' | 'custom';
  message?: string;
}

export const reactionsService = {
  /**
   * Send a reaction to a check-in
   */
  async createReaction(fromUserId: string, input: CreateReactionInput): Promise<CheckInReaction> {
    const supabase = createClient();

    // Use upsert to update existing reaction if user already reacted
    const { data, error } = await supabase
      .from('checkin_reactions')
      .upsert({
        checkin_id: input.checkin_id,
        from_user_id: fromUserId,
        reaction_type: input.reaction_type,
        message: input.message || null,
      }, {
        onConflict: 'checkin_id,from_user_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all reactions for a specific check-in
   */
  async getReactionsForCheckIn(checkinId: string): Promise<CheckInReaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('checkin_reactions')
      .select('id, checkin_id, from_user_id, reaction_type, message, created_at')
      .eq('checkin_id', checkinId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get reactions sent by a specific user
   */
  async getReactionsByUser(userId: string): Promise<CheckInReaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('checkin_reactions')
      .select('id, checkin_id, from_user_id, reaction_type, message, created_at')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete a reaction
   */
  async deleteReaction(reactionId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('checkin_reactions')
      .delete()
      .eq('id', reactionId);

    if (error) throw error;
  },

  /**
   * Check if current user has reacted to a check-in
   */
  async getUserReactionForCheckIn(checkinId: string, userId: string): Promise<CheckInReaction | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('checkin_reactions')
      .select('id, checkin_id, from_user_id, reaction_type, message, created_at')
      .eq('checkin_id', checkinId)
      .eq('from_user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Get validation streak (consecutive days partner sent reactions)
   */
  async getValidationStreak(spaceId: string, userId: string): Promise<number> {
    const supabase = createClient();

    // Get all check-ins with reactions from partner
    const { data: reactions, error } = await supabase
      .from('checkin_reactions')
      .select('created_at, checkin_id')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!reactions || reactions.length === 0) return 0;

    // Calculate consecutive days
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < reactions.length; i++) {
      const reactionDate = new Date(reactions[i].created_at);
      reactionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak);
      expectedDate.setHours(0, 0, 0, 0);

      if (reactionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (reactionDate.getTime() < expectedDate.getTime()) {
        break;
      }
    }

    return streak;
  },

  /**
   * Subscribe to reaction changes for a specific check-in
   */
  subscribeToReactions(checkinId: string, callback: (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => void) {
    const supabase = createClient();

    const channel = supabase
      .channel(`reactions:${checkinId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkin_reactions',
          filter: `checkin_id=eq.${checkinId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribe to all reactions in a space (for notifications)
   */
  subscribeToSpaceReactions(spaceId: string, callback: (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => void) {
    const supabase = createClient();

    // Note: We need to join through checkins to filter by space
    // For now, subscribe to all reactions and filter client-side
    const channel = supabase
      .channel(`space-reactions:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_reactions',
        },
        callback
      )
      .subscribe();

    return channel;
  },
};
