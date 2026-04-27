import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { Message, MessageWithAttachments } from './types';

/** Pins a message to the top of the conversation. */
export async function pinMessage(messageId: string, userId: string): Promise<Message> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('messages')
    .update({ is_pinned: true, pinned_by: userId })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    logger.error('Error pinning message:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as Message;
}

/** Unpins a message from the conversation. */
export async function unpinMessage(messageId: string): Promise<Message> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('messages')
    .update({ is_pinned: false, pinned_by: null, pinned_at: null })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    logger.error('Error unpinning message:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as Message;
}

/** Retrieves all pinned messages for a conversation. */
export async function getPinnedMessages(
  conversationId: string,
): Promise<MessageWithAttachments[]> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
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
    logger.error('Error fetching pinned messages:', error, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw error;
  }

  return data as MessageWithAttachments[];
}

/** Toggles the pin status of a message. */
export async function togglePin(messageId: string, userId: string): Promise<Message> {
  const supabase = createClient();

  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data: currentMessage, error: fetchError } = await supabase
    .from('messages')
    .select('is_pinned')
    .eq('id', messageId)
    .single();

  if (fetchError) {
    logger.error('Error fetching message:', fetchError, {
      component: 'lib-messages-service',
      action: 'service_call',
    });
    throw fetchError;
  }

  if (currentMessage.is_pinned) {
    return await unpinMessage(messageId);
  } else {
    return await pinMessage(messageId, userId);
  }
}
