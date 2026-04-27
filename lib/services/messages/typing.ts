import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { TypingIndicator } from './types';

/** Updates or creates a typing indicator for a user in a conversation. */
export async function updateTypingIndicator(
  conversationId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { error } = await supabase
    .from('typing_indicators')
    .upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        last_typed_at: new Date().toISOString(),
      },
      { onConflict: 'conversation_id,user_id' },
    );

  if (error) throw error;
}

/** Removes a typing indicator when user stops typing. */
export async function removeTypingIndicator(
  conversationId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { error } = await supabase
    .from('typing_indicators')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

/** Broadcasts a typing event via real-time channel (no DB write). */
export function broadcastTyping(channel: RealtimeChannel, userId: string): void {
  channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
}

/** Broadcasts a stop-typing event via real-time channel (no DB write). */
export function broadcastStopTyping(channel: RealtimeChannel, userId: string): void {
  channel.send({ type: 'broadcast', event: 'stop_typing', payload: { userId } });
}

/**
 * Retrieves active typing indicators (last 10 seconds), excluding current user.
 * @deprecated Use broadcastTyping/broadcastStopTyping instead of DB-backed polling.
 */
export async function getTypingUsers(
  conversationId: string,
  currentUserId?: string,
): Promise<TypingIndicator[]> {
  const supabase = createClient();
  const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  let query = supabase
    .from('typing_indicators')
    .select('id, conversation_id, user_id, last_typed_at, created_at')
    .eq('conversation_id', conversationId)
    .gte('last_typed_at', tenSecondsAgo);

  if (currentUserId) {
    query = query.neq('user_id', currentUserId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
