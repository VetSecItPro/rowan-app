'use client';

import { useState } from 'react';
import { MessageCircle, Search, Plus, Archive, X } from 'lucide-react';
import { Conversation } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onClose?: () => void; // For mobile drawer
  showArchived?: boolean;
  className?: string;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
  showArchived = false,
  className = '',
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations based on search and archived status
  const filteredConversations = conversations.filter((conv) => {
    // Filter by archived status
    if (conv.is_archived && !showArchived) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = conv.title?.toLowerCase().includes(query);
      const previewMatch = conv.last_message_preview?.toLowerCase().includes(query);
      return titleMatch || previewMatch;
    }

    return true;
  });

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          Messages
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewConversation}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="New conversation"
            aria-label="Start new conversation"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="text-green-600 dark:text-green-400 text-sm font-medium hover:underline"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeConversationId}
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onClose?.(); // Close mobile drawer on selection
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual conversation item
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const getConversationIcon = () => {
    switch (conversation.conversation_type) {
      case 'group':
        return '👥';
      case 'general':
        return '📢';
      default:
        return '💬';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-start gap-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
        isActive
          ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-600'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-4 border-l-transparent'
      }`}
    >
      {/* Avatar/Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-2xl">
        {conversation.avatar_url ? (
          <img
            src={conversation.avatar_url}
            alt={conversation.title || 'Conversation'}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{getConversationIcon()}</span>
        )}
      </div>

      {/* Conversation Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
            {conversation.title || 'Untitled Conversation'}
          </h3>
          {conversation.last_message_at && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {formatTimestamp(conversation.last_message_at, 'MMM d')}
            </span>
          )}
        </div>

        {/* Last Message Preview */}
        {conversation.last_message_preview && (
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
            {conversation.last_message_preview}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2">
          {conversation.unread_count > 0 && (
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
          {conversation.is_archived && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          )}
          {conversation.conversation_type !== 'direct' && (
            <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full capitalize">
              {conversation.conversation_type}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
