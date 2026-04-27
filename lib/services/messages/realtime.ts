import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Message, Conversation, MessageSubscriptionCallbacks } from './types';

/** Subscribes to real-time message updates for a conversation. */
export function subscribeToMessages(
  conversationId: string,
  callbacks: MessageSubscriptionCallbacks,
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
      },
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
      },
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
      },
    )
    .on(
      'broadcast',
      { event: 'typing' },
      (payload: { payload?: { userId?: string } }) => {
        if (callbacks.onTyping && payload.payload?.userId) {
          callbacks.onTyping(payload.payload.userId);
        }
      },
    )
    .on(
      'broadcast',
      { event: 'stop_typing' },
      (payload: { payload?: { userId?: string } }) => {
        if (callbacks.onStopTyping && payload.payload?.userId) {
          callbacks.onStopTyping(payload.payload.userId);
        }
      },
    )
    .subscribe();

  return channel;
}

/** Subscribes to real-time updates for a single conversation. */
export function subscribeToConversation(
  conversationId: string,
  onUpdate: (conversation: Conversation) => void,
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
      },
    )
    .subscribe();

  return channel;
}

/** Subscribes to real-time conversation list changes for a space. */
export function subscribeToConversations(
  spaceId: string,
  callbacks: {
    onInsert?: (conversation: Conversation) => void;
    onUpdate?: (conversation: Conversation) => void;
    onDelete?: (conversationId: string) => void;
  },
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
      },
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
      },
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
      },
    )
    .subscribe();

  return channel;
}

/** Unsubscribes from a real-time channel (cleanup). */
export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
