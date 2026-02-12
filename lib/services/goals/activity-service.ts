/**
 * Activity Service — Activity feed, comments, reactions, and mentions for goals.
 *
 * @module goals/activity-service
 */

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { goalService } from './goal-service';
import type {
  GoalActivity,
  GoalComment,
  GoalMention,
  CreateCommentInput,
  CreateActivityInput,
} from './types';

export const activityService = {
  // Activity Feed methods

  /**
   * Retrieves the activity feed for a space with user, goal, milestone, and check-in data.
   * @param spaceId - The space ID
   * @param limit - Maximum number of activities to return (default: 20)
   * @param offset - Number of activities to skip for pagination (default: 0)
   * @returns Array of activities sorted by creation date descending
   */
  async getActivityFeed(spaceId: string, limit = 20, offset = 0): Promise<GoalActivity[]> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('goal_activities')
        .select(`
          id, space_id, goal_id, milestone_id, check_in_id, user_id, activity_type, activity_data, title, description, entity_title, entity_type, created_at, updated_at,
          user:users(id, name, avatar_url),
          goal:goals(id, title, status, progress),
          milestone:goal_milestones(id, title, completed),
          check_in:goal_check_ins(id, progress_percentage, mood)
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        // Handle table not found error gracefully
        if (error.message?.includes('goal_activities') || error.code === '42P01') {
          logger.warn('goal_activities table not found, returning empty activity feed', { component: 'lib-goals-service' });
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      logger.error('Error fetching activity feed:', error, { component: 'lib-goals-service', action: 'service_call' });
      return [];
    }
  },

  /**
   * Retrieves the activity feed for a specific goal.
   * @param goalId - The goal ID
   * @param limit - Maximum number of activities to return (default: 20)
   * @param offset - Number of activities to skip for pagination (default: 0)
   * @returns Array of activities sorted by creation date descending
   * @throws Error if the database query fails
   */
  async getGoalActivityFeed(goalId: string, limit = 20, offset = 0): Promise<GoalActivity[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('goal_activities')
      .select(`
        id, space_id, goal_id, milestone_id, check_in_id, user_id, activity_type, activity_data, title, description, entity_title, entity_type, created_at, updated_at,
        user:users(id, name, avatar_url),
        goal:goals(id, title, status, progress),
        milestone:goal_milestones(id, title, completed),
        check_in:goal_check_ins(id, progress_percentage, mood)
      `)
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  /**
   * Creates an activity entry for the goal activity feed.
   * @param input - Activity data including space_id, activity_type, and title
   * @returns The created activity record
   * @throws Error if user is not authenticated or database insert fails
   */
  async createActivity(input: CreateActivityInput): Promise<GoalActivity> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_activities')
      .insert([{
        ...input,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Comments methods

  /**
   * Retrieves all comments for a goal, including replies and user reactions.
   * @param goalId - The goal ID
   * @returns Array of top-level comments with nested replies, sorted by creation date ascending
   * @throws Error if the database query fails
   */
  async getGoalComments(goalId: string): Promise<GoalComment[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('goal_comments')
      .select(`
        id, goal_id, user_id, parent_comment_id, content, content_type, reaction_counts, is_edited, edited_at, created_at, updated_at,
        user:users(id, name, avatar_url)
      `)
      .eq('goal_id', goalId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = data || [];

    // Get replies for each comment
    for (const comment of comments) {
      const { data: replies, error: repliesError } = await supabase
        .from('goal_comments')
        .select(`
          id, goal_id, user_id, parent_comment_id, content, content_type, reaction_counts, is_edited, edited_at, created_at, updated_at,
          user:users(id, name, avatar_url)
        `)
        .eq('parent_comment_id', comment.id)
        .order('created_at', { ascending: true });

      if (!repliesError && replies) {
        comment.replies = replies;
      }

      // Get user's reaction to this comment
      if (user) {
        const { data: userReaction } = await supabase
          .from('goal_comment_reactions')
          .select('emoji')
          .eq('comment_id', comment.id)
          .eq('user_id', user.id)
          .single();

        comment.user_reaction = userReaction?.emoji;
      }
    }

    return comments;
  },

  /**
   * Creates a comment on a goal.
   * Processes @mentions and creates an activity entry.
   * @param input - Comment data including goal_id, content, and optional parent_comment_id
   * @returns The created comment with user data
   * @throws Error if user is not authenticated or database insert fails
   */
  async createComment(input: CreateCommentInput): Promise<GoalComment> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('goal_comments')
      .insert([{
        ...input,
        user_id: user.id,
      }])
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Process @mentions in the comment
    await this.processMentions(data.id, input.content);

    // Create activity for the comment
    const goal = await goalService.getGoalById(input.goal_id);
    if (goal) {
      await this.createActivity({
        space_id: goal.space_id,
        goal_id: input.goal_id,
        activity_type: 'goal_commented',
        title: 'Added comment',
        description: `Comment added to "${goal.title}"`,
        entity_title: goal.title,
        entity_type: 'comment',
        activity_data: {
          goal_title: goal.title,
          comment_content: input.content.slice(0, 100), // First 100 chars
          is_reply: !!input.parent_comment_id,
        },
      });
    }

    return data;
  },

  /**
   * Updates a comment's content.
   * Sets is_edited flag and edited_at timestamp. Reprocesses @mentions.
   * @param commentId - The comment ID to update
   * @param content - The new content
   * @returns The updated comment with user data
   * @throws Error if the database update fails
   */
  async updateComment(commentId: string, content: string): Promise<GoalComment> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('goal_comments')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:users(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update mentions
    await this.processMentions(commentId, content);

    return data;
  },

  /**
   * Permanently deletes a comment.
   * @param commentId - The comment ID to delete
   * @throws Error if the database delete fails
   */
  async deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('goal_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  },

  /**
   * Toggles a reaction on a comment (adds if not present, removes if present).
   * Only one reaction per user per comment is allowed.
   * @param commentId - The comment ID
   * @param emoji - The emoji to toggle
   * @throws Error if user is not authenticated or database operation fails
   */
  async toggleCommentReaction(commentId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if user already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('goal_comment_reactions')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('goal_comment_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (error) throw error;
    } else {
      // Add reaction (first remove any other reaction from this user)
      await supabase
        .from('goal_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('goal_comment_reactions')
        .insert([{
          comment_id: commentId,
          user_id: user.id,
          emoji,
        }]);

      if (error) throw error;
    }
  },

  /**
   * Processes @mentions in comment content and creates mention records.
   * Extracts usernames from @username patterns and links to user records.
   * @param commentId - The comment ID containing mentions
   * @param content - The comment content to parse for mentions
   */
  async processMentions(commentId: string, content: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Extract mentions from content (@username pattern)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]); // username without @
    }

    if (mentions.length === 0) return;

    // Get user IDs for mentioned usernames
    const { data: mentionedUsers } = await supabase
      .from('users')
      .select('id, name')
      .in('name', mentions);

    if (!mentionedUsers || mentionedUsers.length === 0) return;

    // Remove existing mentions for this comment
    await supabase
      .from('goal_mentions')
      .delete()
      .eq('comment_id', commentId);

    // Create new mentions
    const mentionInserts = mentionedUsers.map((mentionedUser: { id: string }) => ({
      comment_id: commentId,
      mentioned_user_id: mentionedUser.id,
      mentioning_user_id: user.id,
    }));

    const { error } = await supabase
      .from('goal_mentions')
      .insert(mentionInserts);

    if (error) {
      logger.error('Failed to create mentions:', error, { component: 'lib-goals-service', action: 'service_call' });
    }
  },

  /**
   * Retrieves all mentions for a user across all goals.
   * @param userId - Optional user ID (defaults to current authenticated user)
   * @returns Array of mentions with comment and mentioning user data
   * @throws Error if user is not authenticated or database query fails
   */
  async getUserMentions(userId?: string): Promise<GoalMention[]> {
    const supabase = createClient();
    let targetUserId = userId;

    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('goal_mentions')
      .select(`
        id, comment_id, mentioned_user_id, mentioning_user_id, is_read, read_at, created_at,
        comment:goal_comments(
          id,
          content,
          goal_id,
          user:users(id, name, avatar_url),
          goal:goals(id, title)
        ),
        mentioning_user:users(id, name, avatar_url)
      `)
      .eq('mentioned_user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Marks a mention as read.
   * @param mentionId - The mention ID to mark as read
   * @throws Error if the database update fails
   */
  async markMentionAsRead(mentionId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('goal_mentions')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', mentionId);

    if (error) throw error;
  },
};
