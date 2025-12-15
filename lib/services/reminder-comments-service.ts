import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// =============================================
// TYPES & VALIDATION
// =============================================

export interface ReminderComment {
  id: string;
  reminder_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// Zod schemas
const CreateCommentSchema = z.object({
  reminder_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;

// =============================================
// SERVICE
// =============================================

export const reminderCommentsService = {
  /**
   * Get comments for a reminder
   */
  async getComments(reminderId: string): Promise<ReminderComment[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminder_comments')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('reminder_id', reminderId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching comments:', error, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Failed to fetch comments');
    }

    return data || [];
  },

  /**
   * Get comment count for a reminder
   */
  async getCommentCount(reminderId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('reminder_comments')
      .select('*', { count: 'exact', head: true })
      .eq('reminder_id', reminderId);

    if (error) {
      logger.error('Error fetching comment count:', error, { component: 'lib-reminder-comments-service', action: 'service_call' });
      return 0;
    }

    return count || 0;
  },

  /**
   * Create a new comment
   */
  async createComment(input: CreateCommentInput & { space_id?: string }): Promise<ReminderComment> {
    const supabase = createClient();

    // Validate input
    const validated = CreateCommentSchema.parse(input);

    // Security: Verify user has access to the reminder's space
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('space_id')
      .eq('id', validated.reminder_id)
      .single();

    if (reminderError || !reminder) {
      logger.error('Reminder not found:', reminderError, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Reminder not found');
    }

    // Use the space_id from the reminder (more secure)
    const spaceId = reminder.space_id;

    // Check if user has access to the space - using the same pattern as other services
    const { data: membership, error: membershipError } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('user_id', validated.user_id)
      .maybeSingle();

    if (membershipError) {
      logger.error('Error checking space membership:', membershipError, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Failed to verify space access');
    }

    if (!membership) {
      logger.error('User is not a member of this space', undefined, { component: 'lib-reminder-comments-service', action: 'service_call', details: { userId: validated.user_id, spaceId } });
      throw new Error('User is not a member of this space');
    }

    // Create comment
    const { data, error } = await supabase
      .from('reminder_comments')
      .insert({
        reminder_id: validated.reminder_id,
        user_id: validated.user_id,
        content: validated.content,
      })
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating comment:', error, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Failed to create comment');
    }

    return data;
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, updates: UpdateCommentInput): Promise<ReminderComment> {
    const supabase = createClient();

    // Validate input
    const validated = UpdateCommentSchema.parse(updates);

    // Security: Verify user owns this comment
    const { data: existing, error: existingError } = await supabase
      .from('reminder_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (existingError || !existing) {
      logger.error('Comment not found:', existingError, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Comment not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('You can only edit your own comments');
    }

    // Update comment
    const { data, error } = await supabase
      .from('reminder_comments')
      .update({
        content: validated.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating comment:', error, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Failed to update comment');
    }

    return data;
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const supabase = createClient();

    // Security: Verify user owns this comment
    const { data: existing, error: existingError } = await supabase
      .from('reminder_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (existingError || !existing) {
      logger.error('Comment not found:', existingError, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Comment not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('You can only delete your own comments');
    }

    // Delete comment
    const { error } = await supabase
      .from('reminder_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('Error deleting comment:', error, { component: 'lib-reminder-comments-service', action: 'service_call' });
      throw new Error('Failed to delete comment');
    }
  },

  /**
   * Format comment timestamp for display
   */
  formatCommentTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Check if comment was edited
   */
  wasEdited(comment: ReminderComment): boolean {
    const created = new Date(comment.created_at).getTime();
    const updated = new Date(comment.updated_at).getTime();
    return updated - created > 1000; // More than 1 second difference
  },
};
