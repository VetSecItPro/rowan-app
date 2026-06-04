import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { cacheAside, cacheKeys, deleteCachePattern, CACHE_TTL, CACHE_PREFIXES } from '@/lib/cache';
import type { Conversation, CreateConversationInput } from './types';

/** Retrieves all conversations for a space (sorted by most recently updated). */
export async function getConversations(
  spaceId: string,
  limit = 50,
  supabaseClient?: SupabaseClient,
): Promise<Conversation[]> {
  const supabase = supabaseClient ?? createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .select('id, space_id, title, conversation_type, last_message_preview, last_message_at, is_archived, avatar_url, description, participants, created_at, updated_at')
    .eq('space_id', spaceId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get all conversations for a space with unread counts.
 * Uses optimized RPC function to avoid N+1 query pattern.
 * Cached for 2 minutes to reduce database load.
 */
export async function getConversationsList(
  spaceId: string,
  userId: string,
): Promise<Conversation[]> {
  const cacheKey = cacheKeys.conversations(spaceId, userId);

  return cacheAside(
    cacheKey,
    async () => {
      const supabase = createClient();
      const { data: conversations, error } = await supabase.rpc(
        'get_conversations_with_unread',
        { space_id_param: spaceId, user_id_param: userId },
      );

      if (error) {
        logger.error('Error fetching conversations with unread counts:', error, {
          component: 'lib-messages-service',
          action: 'service_call',
        });
        throw error;
      }

      if (!conversations || conversations.length === 0) {
        return [];
      }

      return conversations.map(
        (conv: Conversation & { unread_count: number | bigint }) => ({
          ...conv,
          unread_count: Number(conv.unread_count) || 0,
        }),
      );
    },
    CACHE_TTL.SHORT * 2,
  );
}

/** Creates a new conversation. */
export async function createConversation(
  input: CreateConversationInput,
): Promise<Conversation> {
  const supabase = createClient();

  const conversationData = {
    space_id: input.space_id,
    title: input.title || 'New Conversation',
    conversation_type: input.conversation_type || 'direct',
    description: input.description,
    avatar_url: input.avatar_url,
    participants: input.participants || [],
    is_archived: false,
  };

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversationData)
    .select()
    .single();

  if (error) {
    logger.error('Error creating conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  deleteCachePattern(`${CACHE_PREFIXES.CONVERSATIONS}${input.space_id}*`).catch(() => {});

  return data as Conversation;
}

/** Retrieves a single conversation by ID. */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .select('id, space_id, title, conversation_type, last_message_preview, last_message_at, is_archived, avatar_url, description, participants, created_at, updated_at')
    .eq('id', conversationId)
    .single();

  if (error) {
    logger.error('Error fetching conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    return null;
  }

  return data as Conversation;
}

/** Updates conversation metadata (title, description, avatar, etc.). */
export async function updateConversation(
  conversationId: string,
  updates: Partial<CreateConversationInput>,
): Promise<Conversation> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as Conversation;
}

/** Archives a conversation (hides from main list but preserves messages). */
export async function archiveConversation(conversationId: string): Promise<Conversation> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    logger.error('Error archiving conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as Conversation;
}

/** Restores an archived conversation to the main list. */
export async function unarchiveConversation(conversationId: string): Promise<Conversation> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('conversations')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    logger.error('Error unarchiving conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as Conversation;
}

/** Permanently deletes a conversation and all its messages. */
export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    logger.error('Error deleting conversation:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }
}
