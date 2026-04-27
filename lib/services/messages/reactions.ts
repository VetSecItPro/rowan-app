import { createClient } from '@/lib/supabase/client';
import type { MessageReaction, MessageReactionSummary } from './types';

/** Adds a reaction to a message. */
export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<MessageReaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_reactions')
    .insert([{ message_id: messageId, user_id: userId, emoji }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Removes a reaction from a message. */
export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) throw error;
}

/** Retrieves reaction summary for a message grouped by emoji. */
export async function getMessageReactions(
  messageId: string,
  currentUserId?: string,
): Promise<MessageReactionSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('message_reactions')
    .select('id, message_id, user_id, emoji, created_at')
    .eq('message_id', messageId);

  if (error) throw error;

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
}

/** Toggles a reaction on a message (adds if not present, removes if present). */
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<'added' | 'removed'> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .single();

  if (existing) {
    await removeReaction(messageId, userId, emoji);
    return 'removed';
  } else {
    await addReaction(messageId, userId, emoji);
    return 'added';
  }
}
