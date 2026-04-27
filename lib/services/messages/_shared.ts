import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/** Security: Default maximum limit for list queries to prevent unbounded data retrieval. */
export const DEFAULT_MAX_LIMIT = 500;

/** Number of messages to fetch per page in cursor-based pagination. */
export const MESSAGES_PAGE_SIZE = 50;

/** Columns selected for message reads (avoids select('*')). */
export const MESSAGE_COLUMNS =
  'id, space_id, conversation_id, sender_id, content, read, read_at, attachments, parent_message_id, thread_reply_count, is_pinned, pinned_at, pinned_by, created_at, updated_at, deleted_at, deleted_for_everyone, deleted_by, deleted_for_users';

export const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

export interface MessageWriteOptions {
  userId?: string;
  supabaseClient?: SupabaseClient;
}
