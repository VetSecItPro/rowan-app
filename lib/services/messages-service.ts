import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FileUploadResult } from './file-upload-service';

export interface Message {
  id: string;
  space_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface MessageWithAttachments extends Message {
  attachments_data?: FileUploadResult[];
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
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageInput {
  space_id: string;
  conversation_id: string | null;
  sender_id?: string;
  content: string;
  attachments?: string[];
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

  async createConversation(input: { space_id: string; title?: string; participants: string[] }): Promise<Conversation> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('conversations')
      .insert([{
        space_id: input.space_id,
        title: input.title,
        participants: input.participants,
        unread_count: 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const supabase = createClient();
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

  async getMessageById(id: string): Promise<Message | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createMessage(input: CreateMessageInput): Promise<Message> {
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

  async updateMessage(id: string, updates: Partial<CreateMessageInput>): Promise<Message> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async markAsRead(id: string): Promise<Message> {
    const supabase = createClient();
    return this.updateMessage(id, {
      read: true,
    } as any);
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('read', false);

    if (error) throw error;
  },

  async getMessageStats(spaceId: string): Promise<MessageStats> {
    const supabase = createClient();
    const [messagesResult, conversationsResult] = await Promise.all([
      supabase
        .from('messages')
        .select('*, conversation:conversations!inner(space_id)')
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
      thisWeek: messages.filter(m => new Date(m.created_at) >= weekStart).length,
      unread: messages.filter(m => !m.read).length,
      today: messages.filter(m => new Date(m.created_at) >= today).length,
      total: messages.length,
      conversations: conversations.length,
    };
  },

  async searchMessages(spaceId: string, query: string): Promise<Message[]> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('messages')
      .select('*, conversation:conversations!inner(space_id)')
      .eq('conversation.space_id', spaceId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50);

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
        (payload) => {
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
        (payload) => {
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
        (payload) => {
          if (callbacks.onDelete) {
            callbacks.onDelete(payload.old.id);
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
        (payload) => {
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
};
