/**
 * Messages Service — barrel re-export.
 *
 * This file used to be a 1432-line monolith. Split 2026-04-27 into
 * lib/services/messages/{types,messages,threads,reactions,typing,pinning,conversations,realtime}.ts
 * The public API surface — type exports + the messagesService object — is preserved
 * exactly so existing import sites don't change.
 *
 * Importing convention:
 *   import { messagesService, type Message } from '@/lib/services/messages-service';
 *
 * If you're adding a new method, put the implementation in the appropriate
 * sub-file under lib/services/messages/ and add it to the messagesService object below.
 */

import * as messagesModule from './messages/messages';
import * as threadsModule from './messages/threads';
import * as reactionsModule from './messages/reactions';
import * as typingModule from './messages/typing';
import * as pinningModule from './messages/pinning';
import * as conversationsModule from './messages/conversations';
import * as realtimeModule from './messages/realtime';

// Re-export every type so consumers can `import type { Message } from '@/lib/services/messages-service'`.
export type {
  Message,
  MessageWithAttachments,
  MessageWithReplies,
  PaginatedMessages,
  MessageReaction,
  MessageReactionSummary,
  TypingIndicator,
  MessageSubscriptionCallbacks,
  Conversation,
  CreateConversationInput,
  CreateMessageInput,
  MessageStats,
  DeleteMessageMode,
} from './messages/types';

/**
 * Comprehensive messaging system with conversations, threads, reactions,
 * pinning, typing indicators, soft deletion, and real-time updates.
 */
export const messagesService = {
  // Conversations
  getConversations: conversationsModule.getConversations,
  getConversationsList: conversationsModule.getConversationsList,
  createConversation: conversationsModule.createConversation,
  getConversation: conversationsModule.getConversation,
  updateConversation: conversationsModule.updateConversation,
  archiveConversation: conversationsModule.archiveConversation,
  unarchiveConversation: conversationsModule.unarchiveConversation,
  deleteConversation: conversationsModule.deleteConversation,

  // Messages CRUD + stats
  getMessages: messagesModule.getMessages,
  getMessagesWithAttachments: messagesModule.getMessagesWithAttachments,
  getMessageById: messagesModule.getMessageById,
  createMessage: messagesModule.createMessage,
  updateMessage: messagesModule.updateMessage,
  deleteMessage: messagesModule.deleteMessage,
  markAsRead: messagesModule.markAsRead,
  markConversationAsRead: messagesModule.markConversationAsRead,
  getMessageStats: messagesModule.getMessageStats,
  searchMessages: messagesModule.searchMessages,
  getUnreadCount: messagesModule.getUnreadCount,

  // Threads
  getThreadReplies: threadsModule.getThreadReplies,
  getMessagesWithThreads: threadsModule.getMessagesWithThreads,
  createReply: threadsModule.createReply,

  // Reactions
  addReaction: reactionsModule.addReaction,
  removeReaction: reactionsModule.removeReaction,
  getMessageReactions: reactionsModule.getMessageReactions,
  toggleReaction: reactionsModule.toggleReaction,

  // Typing indicators
  updateTypingIndicator: typingModule.updateTypingIndicator,
  removeTypingIndicator: typingModule.removeTypingIndicator,
  broadcastTyping: typingModule.broadcastTyping,
  broadcastStopTyping: typingModule.broadcastStopTyping,
  getTypingUsers: typingModule.getTypingUsers,

  // Pinning
  pinMessage: pinningModule.pinMessage,
  unpinMessage: pinningModule.unpinMessage,
  getPinnedMessages: pinningModule.getPinnedMessages,
  togglePin: pinningModule.togglePin,

  // Real-time subscriptions
  subscribeToMessages: realtimeModule.subscribeToMessages,
  subscribeToConversation: realtimeModule.subscribeToConversation,
  subscribeToConversations: realtimeModule.subscribeToConversations,
  unsubscribe: realtimeModule.unsubscribe,
};
