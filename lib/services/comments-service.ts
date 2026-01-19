import { createClient } from '@/lib/supabase/client';

// ==================== TYPES ====================

export type CommentableType =
  | 'expense'
  | 'goal'
  | 'task'
  | 'project'
  | 'budget'
  | 'bill'
  | 'meal_plan'
  | 'shopping_list'
  | 'message';

export type ActivityType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'completed'
  | 'commented'
  | 'mentioned'
  | 'reacted'
  | 'shared'
  | 'assigned'
  | 'status_changed'
  | 'amount_changed'
  | 'date_changed';

export interface Comment {
  id: string;
  space_id: string;
  commentable_type: CommentableType;
  commentable_id: string;
  content: string;
  parent_comment_id: string | null;
  thread_depth: number;
  created_by: string;
  edited_at: string | null;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  user_ids: string[];
}

export interface ActivityLog {
  id: string;
  space_id: string;
  activity_type: ActivityType;
  entity_type: CommentableType;
  entity_id: string;
  user_id: string;
  user_email?: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  is_system: boolean;
  created_at: string;
}

export interface CreateCommentInput {
  space_id: string;
  commentable_type: CommentableType;
  commentable_id: string;
  content: string;
  parent_comment_id?: string;
  created_by: string;
}

export interface UpdateCommentInput {
  content?: string;
  is_pinned?: boolean;
}

export interface CreateActivityLogInput {
  space_id: string;
  activity_type: ActivityType;
  entity_type: CommentableType;
  entity_id: string;
  user_id: string;
  description?: string;
  metadata?: Record<string, unknown>;
  is_system?: boolean;
}

export interface CommentWithDetails extends Comment {
  user_email?: string;
  replies?: CommentWithDetails[];
  reaction_counts?: { emoji: string; count: number; user_ids: string[] }[];
  mentions?: Mention[];
}

export interface UnreadMention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  comment_content: string;
  commentable_type: CommentableType;
  commentable_id: string;
  comment_author_id: string;
  comment_author_email: string;
  created_at: string;
}

type CommentRow = Comment & { users?: { email?: string | null } };
type ReactionCountRow = { emoji: string; reaction_count: number; user_ids: string[] };
type ActivityLogRow = ActivityLog & { users?: { email?: string | null } };

// ==================== COMMENTS ====================

/**
 * Gets all comments for an entity
 */
export async function getComments(
  commentableType: CommentableType,
  commentableId: string
): Promise<CommentWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*, users!user_id!inner(email)')
    .eq('commentable_type', commentableType)
    .eq('commentable_id', commentableId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Organize into threaded structure
  const commentRows = (data || []) as CommentRow[];
  const comments = commentRows.map((c) => ({
    ...c,
    user_email: c.users?.email,
    replies: [],
  }));

  // Build thread hierarchy
  const topLevel: CommentWithDetails[] = [];
  const commentMap = new Map<string, CommentWithDetails>();

  // First pass: create map
  for (const comment of comments) {
    commentMap.set(comment.id, comment);
  }

  // Second pass: build hierarchy
  for (const comment of comments) {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      }
    } else {
      topLevel.push(comment);
    }
  }

  // Get reactions for all comments
  await enrichWithReactions(topLevel, commentMap);

  return topLevel;
}

/**
 * Enriches comments with reaction counts
 */
async function enrichWithReactions(
  comments: CommentWithDetails[],
  commentMap: Map<string, CommentWithDetails>
): Promise<void> {
  const supabase = createClient();
  const commentIds = Array.from(commentMap.keys());

  if (commentIds.length === 0) return;

  const { data, error } = await supabase.from('reaction_counts').select('*').in('comment_id', commentIds);

  if (error) throw error;

  for (const reaction of data || []) {
    const comment = commentMap.get(reaction.comment_id);
    if (comment) {
      comment.reaction_counts = comment.reaction_counts || [];
      comment.reaction_counts.push({
        emoji: reaction.emoji,
        count: reaction.reaction_count,
        user_ids: reaction.user_ids,
      });
    }
  }
}

/**
 * Gets a single comment by ID
 */
export async function getComment(commentId: string): Promise<CommentWithDetails | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*, users!user_id!inner(email)')
    .eq('id', commentId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;

  const record = data as CommentRow;
  return {
    ...record,
    user_email: record.users?.email,
  };
}

/**
 * Creates a new comment
 */
export async function createComment(input: CreateCommentInput): Promise<Comment> {
  const supabase = createClient();

  // Calculate thread depth if this is a reply
  let threadDepth = 0;
  if (input.parent_comment_id) {
    const { data: parent } = await supabase
      .from('comments')
      .select('thread_depth')
      .eq('id', input.parent_comment_id)
      .single();

    if (parent) {
      threadDepth = Math.min(parent.thread_depth + 1, 5); // Max depth of 5
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        space_id: input.space_id,
        commentable_type: input.commentable_type,
        commentable_id: input.commentable_id,
        content: input.content,
        parent_comment_id: input.parent_comment_id || null,
        thread_depth: threadDepth,
        created_by: input.created_by,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a comment
 */
export async function updateComment(commentId: string, updates: UpdateCommentInput): Promise<Comment> {
  const supabase = createClient();

  const updateData: UpdateCommentInput & { is_edited?: boolean; edited_at?: string } = { ...updates };

  if (updates.content) {
    updateData.is_edited = true;
    updateData.edited_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('comments')
    .update(updateData)
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Soft deletes a comment
 */
export async function deleteComment(commentId: string, deletedBy: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('comments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', commentId);

  if (error) throw error;
}

/**
 * Pins/unpins a comment
 */
export async function togglePinComment(commentId: string, isPinned: boolean): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('comments').update({ is_pinned: isPinned }).eq('id', commentId);

  if (error) throw error;
}

/**
 * Gets comment count for an entity
 */
export async function getCommentCount(
  commentableType: CommentableType,
  commentableId: string
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comment_counts')
    .select('comment_count')
    .eq('commentable_type', commentableType)
    .eq('commentable_id', commentableId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data?.comment_count || 0;
}

// ==================== MENTIONS ====================

/**
 * Gets all mentions for a comment
 */
export async function getCommentMentions(commentId: string): Promise<Mention[]> {
  const supabase = createClient();

  const { data, error } = await supabase.from('mentions').select('*').eq('comment_id', commentId);

  if (error) throw error;
  return data || [];
}

/**
 * Gets unread mentions for a user
 */
export async function getUnreadMentions(userId: string, limit = 50): Promise<UnreadMention[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('unread_mentions')
    .select('*')
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Marks a mention as read
 */
export async function markMentionAsRead(mentionId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('mentions')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', mentionId);

  if (error) throw error;
}

/**
 * Marks all mentions as read for a user
 */
export async function markAllMentionsAsRead(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('mentions')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Gets unread mention count for a user
 */
export async function getUnreadMentionCount(userId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('mentions')
    .select('*', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

// ==================== REACTIONS ====================

/**
 * Adds a reaction to a comment
 */
export async function addReaction(commentId: string, userId: string, emoji: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('comment_reactions').insert([
    {
      comment_id: commentId,
      user_id: userId,
      emoji,
    },
  ]);

  if (error && error.code !== '23505') {
    // Ignore duplicate key errors
    throw error;
  }
}

/**
 * Removes a reaction from a comment
 */
export async function removeReaction(commentId: string, userId: string, emoji: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) throw error;
}

/**
 * Gets all reactions for a comment
 */
export async function getCommentReactions(
  commentId: string
): Promise<{ emoji: string; count: number; user_ids: string[] }[]> {
  const supabase = createClient();

  const { data, error } = await supabase.from('reaction_counts').select('*').eq('comment_id', commentId);

  if (error) throw error;

  return (data || []).map((r: ReactionCountRow) => ({
    emoji: r.emoji,
    count: r.reaction_count,
    user_ids: r.user_ids,
  }));
}

/**
 * Toggles a reaction (add if not exists, remove if exists)
 */
export async function toggleReaction(commentId: string, userId: string, emoji: string): Promise<void> {
  const supabase = createClient();

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('comment_reactions')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    await removeReaction(commentId, userId, emoji);
  } else {
    await addReaction(commentId, userId, emoji);
  }
}

// ==================== ACTIVITY LOGS ====================

/**
 * Creates an activity log entry
 */
export async function createActivityLog(input: CreateActivityLogInput): Promise<ActivityLog> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .insert([
      {
        space_id: input.space_id,
        activity_type: input.activity_type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        user_id: input.user_id,
        description: input.description || null,
        metadata: input.metadata || null,
        is_system: input.is_system || false,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets activity logs for an entity
 */
export async function getEntityActivityLogs(
  entityType: CommentableType,
  entityId: string,
  limit = 50
): Promise<ActivityLog[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Gets activity logs for a space
 */
export async function getSpaceActivityLogs(spaceId: string, limit = 100): Promise<ActivityLog[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Gets activity logs by user
 */
export async function getUserActivityLogs(userId: string, spaceId?: string, limit = 50): Promise<ActivityLog[]> {
  const supabase = createClient();

  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (spaceId) {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Gets activity logs by type
 */
export async function getActivityLogsByType(
  spaceId: string,
  activityType: ActivityType,
  limit = 50
): Promise<ActivityLog[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('space_id', spaceId)
    .eq('activity_type', activityType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Gets recent activity feed for a space (formatted for display)
 */
export async function getActivityFeed(
  spaceId: string,
  limit = 20
): Promise<
  (ActivityLog & {
    user_email?: string;
  })[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, users!user_id!inner(email)')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((log: ActivityLogRow) => ({
    ...log,
    user_email: log.users?.email,
  }));
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extracts @mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_.]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map((m) => m.substring(1)) : [];
}

/**
 * Formats activity description for display
 */
export function formatActivityDescription(log: ActivityLog): string {
  const { activity_type, entity_type, metadata } = log;

  switch (activity_type) {
    case 'created':
      return `Created a new ${entity_type}`;
    case 'updated':
      return `Updated ${entity_type}`;
    case 'deleted':
      return `Deleted ${entity_type}`;
    case 'completed':
      return `Completed ${entity_type}`;
    case 'commented':
      return `Commented on ${entity_type}`;
    case 'mentioned':
      return `Mentioned someone in ${entity_type}`;
    case 'reacted':
      return `Reacted ${metadata?.emoji || ''} to ${entity_type}`;
    case 'status_changed':
      return `Changed status of ${entity_type} to ${metadata?.new_value || ''}`;
    case 'amount_changed':
      return `Changed amount of ${entity_type}`;
    default:
      return log.description || `Activity on ${entity_type}`;
  }
}

/**
 * Gets activity statistics for a space
 */
export async function getActivityStats(
  spaceId: string,
  days = 30
): Promise<{
  total_activities: number;
  by_type: Record<ActivityType, number>;
  top_contributors: { user_id: string; count: number }[];
}> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('activity_logs')
    .select('activity_type, user_id')
    .eq('space_id', spaceId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const byType: Record<string, number> = {};
  const byUser: Record<string, number> = {};

  for (const log of data || []) {
    byType[log.activity_type] = (byType[log.activity_type] || 0) + 1;
    byUser[log.user_id] = (byUser[log.user_id] || 0) + 1;
  }

  const topContributors = Object.entries(byUser)
    .map(([user_id, count]) => ({ user_id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total_activities: data?.length || 0,
    by_type: byType as Record<ActivityType, number>,
    top_contributors: topContributors,
  };
}
