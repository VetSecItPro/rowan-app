import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  parent_comment_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  replies?: EventComment[];
}

export interface CreateCommentInput {
  event_id: string;
  space_id: string;
  content: string;
  mentions?: string[];
  parent_comment_id?: string;
}

export interface UpdateCommentInput {
  content: string;
  mentions?: string[];
}

export const eventCommentsService = {
  /**
   * Create a new comment
   */
  async createComment(input: CreateCommentInput): Promise<EventComment> {
    const supabase = createClient();

    // Get current user ID for RLS policy compliance
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('event_comments')
      .insert([{
        event_id: input.event_id,
        space_id: input.space_id,
        user_id: user.id,
        content: input.content,
        mentions: input.mentions || [],
        parent_comment_id: input.parent_comment_id
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user info separately (FK is to auth.users, not public.users)
    let userInfo = null;
    if (data.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', data.user_id)
        .single();
      userInfo = userData;
    }

    // TODO: Send notifications to mentioned users
    if (input.mentions && input.mentions.length > 0) {
      await this.notifyMentionedUsers(input.event_id, input.mentions, input.content);
    }

    return { ...data, user: userInfo };
  },

  /**
   * Get all comments for an event (with nested replies)
   */
  async getComments(eventId: string): Promise<EventComment[]> {
    const supabase = createClient();

    // Get top-level comments (no parent) - fetch without user join since FK is to auth.users
    const { data: topLevelComments, error: topError } = await supabase
      .from('event_comments')
      .select('*')
      .eq('event_id', eventId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (topError) throw topError;

    // Get all replies
    const { data: replies, error: repliesError } = await supabase
      .from('event_comments')
      .select('*')
      .eq('event_id', eventId)
      .not('parent_comment_id', 'is', null)
      .order('created_at', { ascending: true });

    if (repliesError) throw repliesError;

    // Get unique user IDs to fetch user info
    const allComments = [...(topLevelComments || []), ...(replies || [])];
    const userIds = [...new Set(allComments.map(c => c.user_id))];

    // Fetch user info from public.users table
    let usersMap: Record<string, { id: string; name: string; avatar_url?: string }> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', userIds);

      if (users) {
        usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, { id: string; name: string; avatar_url?: string }>);
      }
    }

    // Add user info to comments
    const topCommentsWithUsers = (topLevelComments || []).map(comment => ({
      ...comment,
      user: usersMap[comment.user_id] || null
    }));

    const repliesWithUsers = (replies || []).map(reply => ({
      ...reply,
      user: usersMap[reply.user_id] || null
    }));

    // Nest replies under their parent comments
    const commentsWithReplies = topCommentsWithUsers.map((comment: { id: string; [key: string]: unknown }) => ({
      ...comment,
      replies: repliesWithUsers.filter((reply: { parent_comment_id: string }) => reply.parent_comment_id === comment.id)
    }));

    return commentsWithReplies;
  },

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string): Promise<EventComment> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (error) throw error;

    // Fetch user info separately (FK is to auth.users, not public.users)
    let user = null;
    if (data.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', data.user_id)
        .single();
      user = userData;
    }

    return { ...data, user };
  },

  /**
   * Update a comment (user can only update their own)
   */
  async updateComment(commentId: string, input: UpdateCommentInput): Promise<EventComment> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('event_comments')
      .update({
        content: input.content,
        mentions: input.mentions || []
      })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw error;

    // Fetch user info separately (FK is to auth.users, not public.users)
    let user = null;
    if (data.user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', data.user_id)
        .single();
      user = userData;
    }

    // TODO: Send notifications to newly mentioned users
    if (input.mentions && input.mentions.length > 0) {
      await this.notifyMentionedUsers(data.event_id, input.mentions, input.content);
    }

    return { ...data, user };
  },

  /**
   * Delete a comment (user can only delete their own)
   */
  async deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  /**
   * Get comment count for an event
   */
  async getCommentCount(eventId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('event_comments')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Parse @mentions from comment content
   */
  parseMentions(content: string): string[] {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // Extract user ID
    }

    return mentions;
  },

  /**
   * Format content with @mentions for display
   */
  formatMentions(content: string): string {
    return content.replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      '<span class="mention">@$1</span>'
    );
  },

  /**
   * Send notifications to mentioned users
   * TODO: Integrate with notification system when available
   */
  async notifyMentionedUsers(
    eventId: string,
    userIds: string[],
    content: string
  ): Promise<void> {
    const supabase = createClient();

    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!event || !user) return;

    // Create notifications for mentioned users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'event_mention',
      title: `${user.user_metadata?.name || 'Someone'} mentioned you`,
      message: `You were mentioned in a comment on "${event.title}"`,
      link: `/calendar?event=${eventId}`,
      read: false
    }));

    // Insert notifications (if notifications table exists)
    try {
      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      logger.error('Failed to create mention notifications:', error, { component: 'lib-event-comments-service', action: 'service_call' });
    }
  }
};
