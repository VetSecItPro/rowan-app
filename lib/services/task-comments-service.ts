import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Task Comments & Reactions Service
 *
 * Manages comments, threaded replies, and emoji reactions for tasks.
 */

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentInput {
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TaskReaction {
  id: string;
  task_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const taskCommentsService = {
  // ===== COMMENTS =====

  /**
   * Get all comments for a task (including threaded replies)
   */
  async getComments(taskId: string): Promise<TaskComment[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching comments:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Add a comment to a task
   */
  async addComment(input: CreateCommentInput): Promise<TaskComment> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error adding comment:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, content: string): Promise<TaskComment> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .update({ content })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating comment:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting comment:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  // ===== COMMENT REACTIONS =====

  /**
   * Add a reaction to a comment
   */
  async addCommentReaction(commentId: string, userId: string, emoji: string): Promise<CommentReaction> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: userId,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error adding comment reaction:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Remove a reaction from a comment
   */
  async removeCommentReaction(reactionId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('task_comment_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error removing comment reaction:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get all reactions for a comment
   */
  async getCommentReactions(commentId: string): Promise<CommentReaction[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_comment_reactions')
        .select('*')
        .eq('comment_id', commentId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching comment reactions:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  // ===== TASK REACTIONS =====

  /**
   * Add a reaction to a task
   */
  async addTaskReaction(taskId: string, userId: string, emoji: string): Promise<TaskReaction> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_reactions')
        .insert({
          task_id: taskId,
          user_id: userId,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error adding task reaction:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Remove a reaction from a task
   */
  async removeTaskReaction(reactionId: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('task_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error removing task reaction:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get all reactions for a task
   */
  async getTaskReactions(taskId: string): Promise<TaskReaction[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('task_reactions')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error fetching task reactions:', error, { component: 'lib-task-comments-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Get aggregated reaction counts for a task
   */
  async getTaskReactionCounts(taskId: string): Promise<{ emoji: string; count: number }[]> {
    const reactions = await this.getTaskReactions(taskId);
    const counts = new Map<string, number>();

    reactions.forEach((reaction) => {
      counts.set(reaction.emoji, (counts.get(reaction.emoji) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
  },
};
