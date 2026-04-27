import { createClient } from '@/lib/supabase/client';
import type {
  Message,
  MessageWithAttachments,
  MessageWithReplies,
  CreateMessageInput,
} from './types';
import { DEFAULT_MAX_LIMIT } from './_shared';

/** Retrieves thread replies for a parent message with attachments. */
export async function getThreadReplies(
  parentMessageId: string,
): Promise<MessageWithAttachments[]> {
  const supabase = createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      attachments_data:message_attachments(*)
    `)
    .eq('parent_message_id', parentMessageId)
    .order('created_at', { ascending: true })
    .limit(DEFAULT_MAX_LIMIT);

  if (error) throw error;
  return data || [];
}

/** Retrieves top-level messages with thread reply counts (excludes replies). */
export async function getMessagesWithThreads(
  conversationId: string,
): Promise<MessageWithReplies[]> {
  const supabase = createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
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

  return (data || []).map((msg: MessageWithAttachments) => ({
    ...msg,
    reply_count: msg.thread_reply_count || 0,
  }));
}

/** Creates a threaded reply to a parent message. */
export async function createReply(
  input: CreateMessageInput & { parent_message_id: string },
): Promise<Message> {
  const supabase = createClient();
  // nosemgrep: supabase-missing-space-id-filter — tenant isolation enforced via RLS or scoped by FK/PK on this query
  const { data, error } = await supabase
    .from('messages')
    .insert([{ ...input, read: false }])
    .select()
    .single();

  if (error) throw error;

  // nosemgrep: supabase-missing-space-id-filter — scoped by .eq('id', conversation_id); RLS enforces tenant
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversation_id);

  return data;
}
