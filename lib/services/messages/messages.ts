import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { enhancedNotificationService } from '../enhanced-notification-service';
import { sanitizeSearchInput } from '@/lib/utils/input-sanitization';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { deleteCachePattern, CACHE_PREFIXES } from '@/lib/cache';
import { getAppUrl } from '@/lib/utils/app-url';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';
import type {
  Message,
  MessageWithAttachments,
  CreateMessageInput,
  DeleteMessageMode,
  MessageStats,
  PaginatedMessages,
} from './types';
import {
  DEFAULT_MAX_LIMIT,
  MESSAGES_PAGE_SIZE,
  MESSAGE_COLUMNS,
  getSupabaseClient,
  type MessageWriteOptions,
} from './_shared';

/**
 * Retrieves paginated messages for a conversation using cursor-based pagination.
 * Returns newest messages first (reversed to chronological order for display).
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
  supabaseClient?: SupabaseClient,
): Promise<PaginatedMessages> {
  const supabase = getSupabaseClient(supabaseClient);
  const limit = Math.min(options?.limit ?? MESSAGES_PAGE_SIZE, DEFAULT_MAX_LIMIT);

  let query = supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.before) {
    query = query.lt('created_at', options.before);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();
  rows.reverse();

  return {
    messages: rows,
    hasMore,
    nextCursor: rows.length > 0 ? rows[0].created_at : null,
  };
}

/** Retrieves messages with their attachment data for a conversation. */
export async function getMessagesWithAttachments(
  conversationId: string,
): Promise<MessageWithAttachments[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      attachments_data:message_attachments(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Retrieves a single message by ID. */
export async function getMessageById(
  id: string,
  supabaseClient?: SupabaseClient,
): Promise<Message | null> {
  const supabase = getSupabaseClient(supabaseClient);
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new message in a conversation.
 * Sanitizes content/attachments, updates conversation timestamp, sends notifications.
 */
export async function createMessage(
  input: CreateMessageInput,
  supabaseClient?: SupabaseClient,
): Promise<Message> {
  const supabase = getSupabaseClient(supabaseClient);
  const sanitizedContent = sanitizePlainText(input.content);
  if (!sanitizedContent) {
    throw new Error('Message content is required');
  }

  let sanitizedAttachments: string[] | undefined;
  if (input.attachments) {
    sanitizedAttachments = input.attachments.map((url) => sanitizeUrl(url));
    if (sanitizedAttachments.some((url) => !url)) {
      throw new Error('Invalid attachment URL');
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert([{
      ...input,
      content: sanitizedContent,
      attachments: sanitizedAttachments,
      read: false,
    }])
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversation_id);

  if (input.conversation_id && input.space_id) {
    try {
      const [{ data: conversationData }, { data: senderData }, { data: spaceData }] = await Promise.all([
        supabase
          .from('conversations')
          .select('title, conversation_type, participants')
          .eq('id', input.conversation_id)
          .single(),
        supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', input.sender_id || '')
          .single(),
        supabase
          .from('spaces')
          .select('name')
          .eq('id', input.space_id)
          .single(),
      ]);

      if (conversationData && senderData) {
        const participants = conversationData.participants?.filter(
          (participantId: string) => participantId !== input.sender_id,
        ) || [];

        if (participants.length > 0) {
          enhancedNotificationService.sendNewMessageNotification(
            participants,
            {
              senderName: senderData.name || 'Someone',
              senderAvatar: senderData.avatar_url,
              messagePreview: sanitizedContent,
              conversationTitle: conversationData.title,
              isDirectMessage: conversationData.conversation_type === 'direct',
              messageCount: 1,
              spaceName: spaceData?.name || 'Your Space',
              messageUrl: `${getAppUrl()}/messages/${input.conversation_id}?space_id=${input.space_id}`,
            },
          ).catch((err) =>
            logger.error('Caught error', err, { component: 'lib-messages-service', action: 'service_call' }),
          );
        }
      }
    } catch (err) {
      logger.error('Failed to send message notification:', err, {
        component: 'lib-messages-service',
        action: 'service_call',
      });
    }
  }

  if (input.space_id) {
    deleteCachePattern(`${CACHE_PREFIXES.CONVERSATIONS}${input.space_id}*`).catch(() => {});
  }

  return data;
}

/**
 * Updates an existing message.
 * Sanitizes content/attachments. Only the sender can edit message content.
 */
export async function updateMessage(
  id: string,
  updates: Partial<CreateMessageInput>,
  options?: MessageWriteOptions,
): Promise<Message> {
  const supabase = getSupabaseClient(options?.supabaseClient);
  const sanitizedUpdates: Partial<CreateMessageInput> = { ...updates };

  if (updates.content !== undefined) {
    const sanitizedContent = sanitizePlainText(updates.content);
    if (!sanitizedContent) {
      throw new Error('Message content is required');
    }
    sanitizedUpdates.content = sanitizedContent;
  }

  if (updates.attachments !== undefined) {
    const sanitizedAttachments = updates.attachments.map((url) => sanitizeUrl(url));
    if (sanitizedAttachments.some((url) => !url)) {
      throw new Error('Invalid attachment URL');
    }
    sanitizedUpdates.attachments = sanitizedAttachments;
  }

  if (options?.userId && (updates.content !== undefined || updates.attachments !== undefined)) {
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (existingMessage?.sender_id !== options.userId) {
      throw new Error('Unauthorized: only the sender can edit this message');
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .update(sanitizedUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a message with WhatsApp-style options.
 * - 'for_me': soft-delete for this user only (appended to deleted_for_users)
 * - 'for_everyone': soft-delete with timestamp + clear content (sender-only)
 */
export async function deleteMessage(
  id: string,
  mode: DeleteMessageMode = 'for_everyone',
  options?: MessageWriteOptions,
): Promise<void> {
  const supabase = getSupabaseClient(options?.supabaseClient);

  if (mode === 'for_me') {
    if (!options?.userId) {
      throw new Error('User ID is required to delete a message for yourself');
    }
    const { data: msg, error: fetchErr } = await supabase
      .from('messages')
      .select('deleted_for_users')
      .eq('id', id)
      .single();

    if (fetchErr) throw fetchErr;

    const existing: string[] = msg?.deleted_for_users ?? [];
    if (!existing.includes(options.userId)) {
      const { error: updateErr } = await supabase
        .from('messages')
        .update({ deleted_for_users: [...existing, options.userId] })
        .eq('id', id);

      if (updateErr) throw updateErr;
    }
  } else {
    if (options?.userId) {
      const { data: existingMessage, error: fetchError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (existingMessage?.sender_id !== options.userId) {
        throw new Error('Unauthorized: only the sender can delete this message for everyone');
      }
    }
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_for_everyone: true,
        deleted_by: options?.userId || null,
        content: '',
      })
      .eq('id', id);

    if (error) throw error;
  }
}

/** Marks all messages in a conversation as read for the current user (via API to bypass RLS). */
export async function markConversationAsRead(conversationId: string): Promise<number> {
  const response = await csrfFetch('/api/messages/mark-conversation-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    logger.error('Failed to mark conversation as read:', errorData, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw new Error(errorData.error || 'Failed to mark conversation as read');
  }

  const result = await response.json();
  return result.markedCount || 0;
}

/** Marks a single message as read by delegating to markConversationAsRead. */
export async function markAsRead(id: string): Promise<Message | null> {
  const supabase = createClient();

  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('conversation_id')
    .eq('id', id)
    .single();

  if (fetchError || !message) {
    logger.error('Failed to fetch message:', fetchError, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    return null;
  }

  await markConversationAsRead(message.conversation_id);

  const { data: updatedMessage, error: refetchError } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('id', id)
    .single();

  if (refetchError) {
    logger.error('Failed to refetch message:', refetchError, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    return null;
  }

  return updatedMessage;
}

/** Retrieves messaging statistics for a space. */
export async function getMessageStats(spaceId: string, userId?: string): Promise<MessageStats> {
  const supabase = createClient();

  let currentUserId = userId;
  if (!currentUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id;
  }

  const [messagesResult, conversationsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('*, conversation:conversations!conversation_id!inner(space_id)')
      .eq('conversation.space_id', spaceId),
    supabase
      .from('conversations')
      .select('id')
      .eq('space_id', spaceId),
  ]);

  if (messagesResult.error) throw messagesResult.error;
  if (conversationsResult.error) throw conversationsResult.error;

  const messages = messagesResult.data || [];
  const conversations = conversationsResult.data || [];
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return {
    thisWeek: messages.filter((m: Message) => new Date(m.created_at) >= weekStart).length,
    unread: messages.filter((m: Message) => !m.read && m.sender_id !== currentUserId).length,
    today: messages.filter((m: Message) => new Date(m.created_at) >= today).length,
    total: messages.length,
    conversations: conversations.length,
  };
}

/** Searches messages by content within a space (max 50 results). */
export async function searchMessages(spaceId: string, query: string): Promise<Message[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*, conversation:conversations!conversation_id!inner(space_id)')
    .eq('conversation.space_id', spaceId)
    .ilike('content', `%${sanitizeSearchInput(query)}%`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/** Get unread message count for a space, excluding messages sent by the given user. */
export async function getUnreadCount(
  spaceId: string,
  userId: string,
  supabaseClient?: SupabaseClient,
): Promise<number> {
  const supabase = getSupabaseClient(supabaseClient);
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*, conversations!inner(space_id)', { count: 'exact', head: true })
      .eq('conversations.space_id', spaceId)
      .eq('read', false)
      .neq('sender_id', userId);

    if (error) {
      logger.error('Error fetching unread count:', error, {
        component: 'messagesService',
        action: 'getUnreadCount',
      });
      return 0;
    }

    return count || 0;
  } catch (err) {
    logger.error('Error fetching unread count:', err, {
      component: 'messagesService',
      action: 'getUnreadCount',
    });
    return 0;
  }
}
