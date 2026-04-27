import type { FileUploadResult } from '../file-upload-service';

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

export interface PaginatedMessages {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
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
  onTyping?: (userId: string) => void;
  onStopTyping?: (userId: string) => void;
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
