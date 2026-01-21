import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { FileUploadResult } from './file-upload-service';
import { enhancedNotificationService } from './enhanced-notification-service';
import { sanitizeSearchInput } from '@/lib/utils/input-sanitization';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { cacheAside, cacheKeys, deleteCachePattern, CACHE_TTL, CACHE_PREFIXES } from '@/lib/cache';
import { getAppUrl } from '@/lib/utils/app-url';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';

/**
 * Security: Default maximum limit for list queries to prevent unbounded data retrieval
 */
const DEFAULT_MAX_LIMIT = 500;

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

interface MessageWriteOptions {
  userId?: string;
  supabaseClient?: SupabaseClient;
}

export interface Message {
  id: string;
  space_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at?: string;
  attachments?: string[];
  parent_message_id?: string;
  thread_reply_count?: number;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  created_at: string;
  updated_at: string;
  // Soft delete fields for WhatsApp-style deletion
  deleted_at?: string;
  deleted_for_everyone?: boolean;
  deleted_by?: string;
  deleted_for_users?: string[];
}

export type DeleteMessageMode = 'for_me' | 'for_everyone';

export interface MessageWithAttachments extends Message {
  attachments_data?: FileUploadResult[];
}

export interface MessageWithReplies extends MessageWithAttachments {
  replies?: MessageWithAttachments[];
  reply_count?: number;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  users: string[];
  reacted_by_current_user: boolean;
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  last_typed_at: string;
  created_at: string;
}

export interface MessageSubscriptionCallbacks {
  onInsert?: (message: Message) => void;
  onUpdate?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export interface Conversation {
  id: string;
  space_id: string;
  title?: string;
  conversation_type: 'direct' | 'group' | 'general';
  last_message_preview?: string;
  last_message_at?: string;
  is_archived: boolean;
  avatar_url?: string;
  description?: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationInput {
  space_id: string;
  title?: string;
  conversation_type?: 'direct' | 'group' | 'general';
  description?: string;
  avatar_url?: string;
  participants?: string[];
}

export interface CreateMessageInput {
  space_id: string;
  conversation_id: string | null;
  sender_id?: string;
  content: string;
  attachments?: string[];
  parent_message_id?: string;
}

export interface MessageStats {
  thisWeek: number;
  unread: number;
  today: number;
  total: number;
  conversations: number;
}

export const messagesService = {
  async getConversations(spaceId: string): Promise<Conversation[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('space_id', spaceId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMessages(conversationId: string, supabaseClient?: SupabaseClient): Promise<Message[]> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getMessagesWithAttachments(conversationId: string): Promise<MessageWithAttachments[]> {
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
  },

  async getMessageById(id: string, supabaseClient?: SupabaseClient): Promise<Message | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createMessage(input: CreateMessageInput, supabaseClient?: SupabaseClient): Promise<Message> {
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

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.conversation_id);

    // Send message notifications to conversation participants (except sender)
    if (input.conversation_id && input.space_id) {
      try {
        // Get conversation details and participants
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
            .single()
        ]);

        if (conversationData && senderData) {
          // Get participants excluding the sender
          const participants = conversationData.participants?.filter(
            (participantId: string) => participantId !== input.sender_id
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
              }
            ).catch((error) => logger.error('Caught error', error, { component: 'lib-messages-service', action: 'service_call' }));
          }
        }
      } catch (error) {
        logger.error('Failed to send message notification:', error, { component: 'lib-messages-service', action: 'service_call' });
        // Don't throw here - message creation should succeed even if notification fails
      }
    }

    // Invalidate conversation cache (affects unread counts) - fire-and-forget
    if (input.space_id) {
      deleteCachePattern(`${CACHE_PREFIXES.CONVERSATIONS}${input.space_id}*`).catch(() => {});
    }

    return data;
  },

  async updateMessage(
    id: string,
    updates: Partial<CreateMessageInput>,
    options?: MessageWriteOptions
  ): Promise<Message> {
    const supabase = getSupabaseClient(options?.supabaseClient);
    const sanitizedUpdates = { ...updates };

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
  },

  /**
   * Delete a message with WhatsApp-style options
   * @param id - Message ID to delete
   * @param userId - Current user ID
   * @param mode - 'for_me' (soft delete for this user only) or 'for_everyone' (soft delete for all)
   */
  async deleteMessage(
    id: string,
    mode: DeleteMessageMode = 'for_everyone',
    options?: MessageWriteOptions
  ): Promise<void> {
    const supabase = getSupabaseClient(options?.supabaseClient);

    if (mode === 'for_me') {
      if (!options?.userId) {
        throw new Error('User ID is required to delete a message for yourself');
      }
      // Delete for me only - add user to deleted_for_users array
      // First get current deleted_for_users
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('deleted_for_users')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const currentDeletedUsers = message?.deleted_for_users || [];
      if (!currentDeletedUsers.includes(options.userId)) {
        const { error } = await supabase
          .from('messages')
          .update({
            deleted_for_users: [...currentDeletedUsers, options.userId]
          })
          .eq('id', id);

        if (error) throw error;
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
      // Delete for everyone - soft delete with timestamp
      const { error } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_for_everyone: true,
          deleted_by: options?.userId || null,
          content: '' // Clear content for privacy
        })
        .eq('id', id);

      if (error) throw error;
    }
  },

  /**
   * Hard delete a message (admin only or for cleanup)
   * @deprecated Use deleteMessage with mode parameter instead
   */
  async hardDeleteMessage(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async markAsRead(id: string): Promise<Message | null> {
    // Mark a single message as read (for individual message marking if needed)
    // This delegates to markConversationAsRead for consistency
    const supabase = createClient();

    // Get the message to find its conversation
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('conversation_id')
      .eq('id', id)
      .single();

    if (fetchError || !message) {
      logger.error('Failed to fetch message:', fetchError, { component: 'lib-messages-service', action: 'service_call' });
      return null;
    }

    // Use conversation-based marking
    await this.markConversationAsRead(message.conversation_id);

    // Return the updated message
    const { data: updatedMessage, error: refetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (refetchError) {
      logger.error('Failed to refetch message:', refetchError, { component: 'lib-messages-service', action: 'service_call' });
      return null;
    }

    return updatedMessage;
  },

  async markConversationAsRead(conversationId: string): Promise<number> {
    // Use API route to bypass RLS
    const response = await csrfFetch('/api/messages/mark-conversation-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error('Failed to mark conversation as read:', errorData, { component: 'lib-messages-service', action: 'service_call' });
      throw new Error(errorData.error || 'Failed to mark conversation as read');
    }

    const result = await response.json();
    return result.markedCount || 0;
  },

  async getMessageStats(spaceId: string, userId?: string): Promise<MessageStats> {
    const supabase = createClient();

    // Get current user if not provided
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
        .eq('space_id', spaceId)
    ]);

    if (messagesResult.error) throw messagesResult.error;
    if (conversationsResult.error) throw conversationsResult.error;

    const messages = messagesResult.data || [];
    const conversations = conversationsResult.data || [];
    const now = new Date();

    // Today's start (midnight)
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // This week's start (last Sunday or Monday, depending on your preference)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    return {
      thisWeek: messages.filter((m: Message) => new Date(m.created_at) >= weekStart).length,
      // Only count unread messages from OTHER users (not your own)
      unread: messages.filter((m: Message) => !m.read && m.sender_id !== currentUserId).length,
      today: messages.filter((m: Message) => new Date(m.created_at) >= today).length,
      total: messages.length,
      conversations: conversations.length,
    };
  },

  async searchMessages(spaceId: string, query: string): Promise<Message[]> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('messages')
      .select('*, conversation:conversations!conversation_id!inner(space_id)')
      .eq('conversation.space_id', spaceId)
      .ilike('content', `%${sanitizeSearchInput(query)}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get thread replies for a parent message (with attachments)
   */
  async getThreadReplies(parentMessageId: string): Promise<MessageWithAttachments[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*)
      `)
      .eq('parent_message_id', parentMessageId)
      .order('created_at', { ascending: true })
      .limit(DEFAULT_MAX_LIMIT); // SECURITY: Prevent unbounded queries

    if (error) throw error;
    return data || [];
  },

  /**
   * Get messages with thread information (top-level messages only, no replies)
   */
  async getMessagesWithThreads(conversationId: string): Promise<MessageWithReplies[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .is('parent_message_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Map to include reply_count from thread_reply_count
    return (data || []).map((msg: MessageWithAttachments) => ({
      ...msg,
      reply_count: msg.thread_reply_count || 0,
    }));
  },

  /**
   * Create a reply to a parent message
   */
  async createReply(input: CreateMessageInput & { parent_message_id: string }): Promise<Message> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...input,
        read: false,
      }])
      .select()
      .single();

    if (error) throw error;

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.conversation_id);

    return data;
  },

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('message_reactions')
      .insert([{
        message_id: messageId,
        user_id: userId,
        emoji,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  },

  /**
   * Get reaction summary for a message
   */
  async getMessageReactions(messageId: string, currentUserId?: string): Promise<MessageReactionSummary[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;

    // Group reactions by emoji
    const reactionMap = new Map<string, MessageReactionSummary>();

    (data || []).forEach((reaction: MessageReaction) => {
      const existing = reactionMap.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.user_id);
        if (currentUserId && reaction.user_id === currentUserId) {
          existing.reacted_by_current_user = true;
        }
      } else {
        reactionMap.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user_id],
          reacted_by_current_user: currentUserId ? reaction.user_id === currentUserId : false,
        });
      }
    });

    return Array.from(reactionMap.values());
  },

  /**
   * Toggle a reaction (add if not present, remove if present)
   */
  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<'added' | 'removed'> {
    const supabase = createClient();

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      // Remove reaction
      await this.removeReaction(messageId, userId, emoji);
      return 'removed';
    } else {
      // Add reaction
      await this.addReaction(messageId, userId, emoji);
      return 'added';
    }
  },

  /**
   * Update typing indicator (upsert)
   */
  async updateTypingIndicator(conversationId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('typing_indicators')
      .upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          last_typed_at: new Date().toISOString(),
        },
        {
          onConflict: 'conversation_id,user_id',
        }
      );

    if (error) throw error;
  },

  /**
   * Remove typing indicator
   */
  async removeTypingIndicator(conversationId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('typing_indicators')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Get active typing users (excluding current user)
   */
  async getTypingUsers(conversationId: string, currentUserId?: string): Promise<TypingIndicator[]> {
    const supabase = createClient();

    // Get typing indicators updated in last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

    let query = supabase
      .from('typing_indicators')
      .select('*')
      .eq('conversation_id', conversationId)
      .gte('last_typed_at', tenSecondsAgo);

    // Exclude current user
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Subscribe to real-time message updates for a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callbacks: MessageSubscriptionCallbacks
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (callbacks.onInsert) {
            callbacks.onInsert(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => {
          if (callbacks.onDelete) {
            callbacks.onDelete((payload.old as Message).id);
          }
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribe to conversation updates
   */
  subscribeToConversation(
    conversationId: string,
    onUpdate: (conversation: Conversation) => void
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          onUpdate(payload.new as Conversation);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from channel (cleanup)
   */
  unsubscribe(channel: RealtimeChannel): void {
    const supabase = createClient();
    supabase.removeChannel(channel);
  },

  // =====================================================
  // MESSAGE PINNING
  // =====================================================

  /**
   * Pin a message to the top of the conversation
   */
  async pinMessage(messageId: string, userId: string): Promise<Message> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_pinned: true,
        pinned_by: userId,
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      logger.error('Error pinning message:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as Message;
  },

  /**
   * Unpin a message
   */
  async unpinMessage(messageId: string): Promise<Message> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .update({
        is_pinned: false,
        pinned_by: null,
        pinned_at: null,
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      logger.error('Error unpinning message:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as Message;
  },

  /**
   * Get all pinned messages for a conversation
   */
  async getPinnedMessages(conversationId: string): Promise<MessageWithAttachments[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        attachments_data:message_attachments(*)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pinned messages:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as MessageWithAttachments[];
  },

  /**
   * Toggle pin status of a message
   */
  async togglePin(messageId: string, userId: string): Promise<Message> {
    const supabase = createClient();

    // First, get current pin status
    const { data: currentMessage, error: fetchError } = await supabase
      .from('messages')
      .select('is_pinned')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      logger.error('Error fetching message:', fetchError, { component: 'lib-messages-service', action: 'service_call' });
      throw fetchError;
    }

    // Toggle the pin status
    if (currentMessage.is_pinned) {
      return await this.unpinMessage(messageId);
    } else {
      return await this.pinMessage(messageId, userId);
    }
  },

  // =====================================================
  // CONVERSATION MANAGEMENT (PHASE 9)
  // =====================================================

  /**
   * Get all conversations for a space with unread counts
   * Uses optimized RPC function to avoid N+1 query pattern
   * Results are cached for 2 minutes to reduce database load
   */
  async getConversationsList(spaceId: string, userId: string): Promise<Conversation[]> {
    const cacheKey = cacheKeys.conversations(spaceId, userId);

    return cacheAside(
      cacheKey,
      async () => {
        const supabase = createClient();

        // Use RPC function that joins conversations with unread counts in a single query
        // This replaces the previous N+1 pattern (1 query + N queries for unread counts)
        const { data: conversations, error } = await supabase.rpc(
          'get_conversations_with_unread',
          {
            space_id_param: spaceId,
            user_id_param: userId,
          }
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

        // Map RPC results to Conversation interface
        // RPC returns unread_count as BIGINT, ensure it's cast to number
        return conversations.map((conv: Conversation & { unread_count: number | bigint }) => ({
          ...conv,
          unread_count: Number(conv.unread_count) || 0,
        }));
      },
      CACHE_TTL.SHORT * 2 // 2 minutes - conversations change frequently
    );
  },

  /**
   * Create a new conversation
   */
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
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

    const { data, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      logger.error('Error creating conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    // Invalidate conversation cache for all users in this space (fire-and-forget)
    deleteCachePattern(`${CACHE_PREFIXES.CONVERSATIONS}${input.space_id}*`).catch(() => {});

    return data as Conversation;
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      logger.error('Error fetching conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      return null;
    }

    return data as Conversation;
  },

  /**
   * Update conversation metadata
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<CreateConversationInput>
  ): Promise<Conversation> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('conversations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as Conversation;
  },

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<Conversation> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('conversations')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      logger.error('Error archiving conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as Conversation;
  },

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(conversationId: string): Promise<Conversation> {
    const supabase = createClient();

    const { data, error} = await supabase
      .from('conversations')
      .update({
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      logger.error('Error unarchiving conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }

    return data as Conversation;
  },

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      logger.error('Error deleting conversation:', error, { component: 'lib-messages-service', action: 'service_call' });
      throw error;
    }
  },

  /**
   * Subscribe to conversation list changes
   */
  subscribeToConversations(
    spaceId: string,
    callbacks: {
      onInsert?: (conversation: Conversation) => void;
      onUpdate?: (conversation: Conversation) => void;
      onDelete?: (conversationId: string) => void;
    }
  ): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversations:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          if (callbacks.onInsert) {
            callbacks.onInsert(payload.new as Conversation);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(payload.new as Conversation);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload: RealtimePostgresChangesPayload<Conversation>) => {
          if (callbacks.onDelete) {
            callbacks.onDelete((payload.old as Conversation).id);
          }
        }
      )
      .subscribe();

    return channel;
  },
};
