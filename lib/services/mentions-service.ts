import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  space_id: string;
  created_at: string;
  read: boolean;
  read_at: string | null;
}

export interface MentionableUser {
  user_id: string;
  display_name: string;
  email: string;
}

export interface CreateMentionInput {
  message_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  space_id: string;
}

// =====================================================
// MENTION EXTRACTION
// =====================================================

/**
 * Extract @mentions from message content
 * Supports formats: @username, @"display name"
 */
export function extractMentions(content: string): string[] {
  const mentions: string[] = [];

  // Match @username (letters, numbers, underscores, hyphens)
  const simplePattern = /@([a-zA-Z0-9_-]+)/g;
  let match;

  while ((match = simplePattern.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  // Match @"display name" (for names with spaces)
  const quotedPattern = /@"([^"]+)"/g;
  while ((match = quotedPattern.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  // Return unique mentions
  return Array.from(new Set(mentions));
}

/**
 * Match mention text to actual users in the space
 */
export async function resolveMentions(
  mentionTexts: string[],
  spaceId: string
): Promise<MentionableUser[]> {
  if (mentionTexts.length === 0) return [];

  // Get all mentionable users in the space
  const spaceMembers = await getMentionableUsers(spaceId);

  // Match mention texts to users (case-insensitive)
  const resolvedUsers: MentionableUser[] = [];

  for (const mentionText of mentionTexts) {
    const lowerMention = mentionText.toLowerCase();

    const matchedUser = spaceMembers.find((member) => {
      const lowerDisplay = member.display_name.toLowerCase();
      const lowerEmail = member.email.toLowerCase().split('@')[0]; // Username part of email

      return lowerDisplay === lowerMention || lowerEmail === lowerMention;
    });

    if (matchedUser) {
      resolvedUsers.push(matchedUser);
    }
  }

  return resolvedUsers;
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Create mention records for a message
 */
export async function createMentions(
  inputs: CreateMentionInput[]
): Promise<MessageMention[]> {
  if (inputs.length === 0) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_mentions')
    .insert(inputs)
    .select();

  if (error) {
    console.error('Error creating mentions:', error);
    throw error;
  }

  return data as MessageMention[];
}

/**
 * Get all mentions for a specific message
 */
export async function getMentionsForMessage(
  messageId: string
): Promise<MessageMention[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_mentions')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching mentions for message:', error);
    throw error;
  }

  return data as MessageMention[];
}

/**
 * Get unread mentions for a user
 */
export async function getUnreadMentions(
  userId: string,
  spaceId?: string
): Promise<MessageMention[]> {
  const supabase = createClient();
  let query = supabase
    .from('message_mentions')
    .select('*')
    .eq('mentioned_user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false });

  if (spaceId) {
    query = query.eq('space_id', spaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching unread mentions:', error);
    throw error;
  }

  return data as MessageMention[];
}

/**
 * Get unread mention count for a user
 */
export async function getUnreadMentionCount(
  userId: string,
  spaceId?: string
): Promise<number> {
  const supabase = createClient();
  let query = supabase
    .from('message_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .eq('read', false);

  if (spaceId) {
    query = query.eq('space_id', spaceId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error fetching unread mention count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Mark a mention as read
 */
export async function markMentionAsRead(
  mentionId: string
): Promise<MessageMention> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_mentions')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', mentionId)
    .select()
    .single();

  if (error) {
    console.error('Error marking mention as read:', error);
    throw error;
  }

  return data as MessageMention;
}

/**
 * Mark all mentions in a message as read for a user
 */
export async function markMessageMentionsAsRead(
  messageId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('message_mentions')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('message_id', messageId)
    .eq('mentioned_user_id', userId);

  if (error) {
    console.error('Error marking message mentions as read:', error);
    throw error;
  }
}

/**
 * Delete all mentions for a message (when message is deleted)
 */
export async function deleteMentionsForMessage(
  messageId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('message_mentions')
    .delete()
    .eq('message_id', messageId);

  if (error) {
    console.error('Error deleting mentions for message:', error);
    throw error;
  }
}

// =====================================================
// HELPER: Get mentionable users for autocomplete
// =====================================================

/**
 * Get all users in a space that can be mentioned
 */
export async function getMentionableUsers(
  spaceId: string
): Promise<MentionableUser[]> {
  const supabase = createClient();
  // Query space_members to get users in this space
  const { data: members, error } = await supabase
    .from('space_members')
    .select(`
      user_id,
      users!user_id!inner (
        id,
        name,
        email,
        color_theme
      )
    `)
    .eq('space_id', spaceId);

  if (error) {
    console.error('Error fetching mentionable users:', error);
    return [];
  }

  // Transform to MentionableUser format
  const mentionableUsers: MentionableUser[] = (members || [])
    .map((member: any) => {
      const user = member.users;
      if (!user) return null;

      return {
        user_id: user.id,
        display_name: user.name || user.email.split('@')[0],
        email: user.email,
      };
    })
    .filter((u: MentionableUser | null): u is MentionableUser => u !== null);

  return mentionableUsers;
}

/**
 * Process message content and create mentions
 * This is the main function to call when sending a message
 */
export async function processMessageMentions(
  messageId: string,
  content: string,
  senderId: string,
  spaceId: string
): Promise<MessageMention[]> {
  // Extract @mentions from content
  const mentionTexts = extractMentions(content);

  if (mentionTexts.length === 0) {
    return [];
  }

  // Resolve mention texts to actual users
  const mentionedUsers = await resolveMentions(mentionTexts, spaceId);

  if (mentionedUsers.length === 0) {
    return [];
  }

  // Create mention records
  const mentionInputs: CreateMentionInput[] = mentionedUsers.map((user) => ({
    message_id: messageId,
    mentioned_user_id: user.user_id,
    mentioned_by_user_id: senderId,
    space_id: spaceId,
  }));

  return await createMentions(mentionInputs);
}

// Export service object for consistency
export const mentionsService = {
  extractMentions,
  resolveMentions,
  createMentions,
  getMentionsForMessage,
  getUnreadMentions,
  getUnreadMentionCount,
  markMentionAsRead,
  markMessageMentionsAsRead,
  deleteMentionsForMessage,
  getMentionableUsers,
  processMessageMentions,
};
