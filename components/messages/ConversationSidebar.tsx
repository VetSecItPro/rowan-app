'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { createPortal } from 'react-dom';
import { MessageCircle, Search, Plus, Archive, X, Edit2, Check, X as XIcon, MoreVertical, Trash2 } from 'lucide-react';
import { Conversation } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { SwipeableConversationItem } from './SwipeableConversationItem';
import { logger } from '@/lib/logger';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation?: (conversationId: string, newTitle: string) => Promise<void>;
  onClose?: () => void; // For mobile drawer
  showArchived?: boolean;
  className?: string;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onClose,
  showArchived = false,
  className = '',
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [dropdownOpenForId, setDropdownOpenForId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter conversations based on search and archived status (memoized with debounced search)
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // Filter by archived status
      if (conv.is_archived && !showArchived) return false;

      // Filter by debounced search query
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const titleMatch = conv.title?.toLowerCase().includes(query);
        const previewMatch = conv.last_message_preview?.toLowerCase().includes(query);
        return titleMatch || previewMatch;
      }

      return true;
    });
  }, [conversations, debouncedSearchQuery, showArchived]);

  // Handle starting rename
  const handleStartRename = (conversation: Conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || '');
  };

  // Handle save rename
  const handleSaveRename = async () => {
    if (!editingConversationId || !editingTitle.trim() || !onRenameConversation) {
      handleCancelRename();
      return;
    }

    try {
      await onRenameConversation(editingConversationId, editingTitle.trim());
      setEditingConversationId(null);
      setEditingTitle('');
    } catch (error) {
      logger.error('Failed to rename conversation:', error, { component: 'ConversationSidebar', action: 'component_action' });
      // Keep editing mode open on error
    }
  };

  // Handle cancel rename
  const handleCancelRename = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  // Handle key press in rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // Handle dropdown open
  const handleOpenDropdown = (conversationId: string, buttonElement: HTMLElement) => {
    const rect = buttonElement.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right + window.scrollX
    });
    setDropdownOpenForId(conversationId);
  };

  // Handle dropdown close
  const handleCloseDropdown = () => {
    setDropdownOpenForId(null);
  };

  // Close dropdown when clicking outside or on escape
  useEffect(() => {
    if (!dropdownOpenForId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpenForId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpenForId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpenForId]);

  return (
    <div className={`flex flex-col h-full bg-gray-900/50 backdrop-blur-2xl backdrop-saturate-150 border-r border-gray-700/30 shadow-xl conversation-sidebar ${className}`}>
      {/* Header - Simplified */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/20 bg-transparent">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </div>
          Messages
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNewConversation}
            className="p-2 hover:bg-emerald-900/30 rounded-full transition-all duration-200 group"
            title="New conversation"
            aria-label="Start new conversation"
          >
            <Plus className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-full transition-all duration-200 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-800/50 backdrop-blur-lg border border-gray-600/40 rounded-full focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-900/30 to-green-900/20 flex items-center justify-center mb-4 shadow-lg">
              <MessageCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-gray-400 text-sm mb-3 font-medium">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white text-sm font-medium rounded-full shadow-md hover:shadow-lg transition-all duration-200"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <SwipeableConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === activeConversationId}
                onClick={() => {
                  if (editingConversationId === conversation.id) {
                    return; // Don't select if currently editing
                  }
                  onSelectConversation(conversation.id);
                  onClose?.(); // Close mobile drawer on selection
                }}
                onDelete={onDeleteConversation}
              >
                <ConversationItem
                  conversation={conversation}
                  isActive={conversation.id === activeConversationId}
                  isEditing={editingConversationId === conversation.id}
                  editingTitle={editingTitle}
                  onTitleChange={setEditingTitle}
                  onStartRename={() => handleStartRename(conversation)}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onKeyDown={handleRenameKeyDown}
                  canRename={!!onRenameConversation}
                  onDelete={onDeleteConversation}
                  onOpenDropdown={handleOpenDropdown}
                  onClick={() => {
                    if (editingConversationId === conversation.id) {
                      return; // Don't select if currently editing
                    }
                    onSelectConversation(conversation.id);
                    onClose?.(); // Close mobile drawer on selection
                  }}
                />
              </SwipeableConversationItem>
            ))}
          </div>
        )}
      </div>

      {/* Portal-based dropdown - Glassmorphism */}
      {dropdownOpenForId && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-44 bg-gray-800/90 backdrop-blur-xl backdrop-saturate-150 border border-gray-600/50 rounded-2xl shadow-2xl shadow-black/40 py-1.5 z-[10000] ring-1 ring-white/5"
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right
          }}
        >
          {onRenameConversation && (
            <button
              onClick={() => {
                handleCloseDropdown();
                const conversation = conversations.find(c => c.id === dropdownOpenForId);
                if (conversation) handleStartRename(conversation);
              }}
              className="w-full px-3 py-2.5 text-left text-sm text-gray-300 hover:bg-emerald-900/30 transition-all duration-200 flex items-center gap-2.5 group"
            >
              <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors" />
              Rename
            </button>
          )}
          {onDeleteConversation && (
            <button
              onClick={() => {
                handleCloseDropdown();
                if (dropdownOpenForId) {
                  onDeleteConversation(dropdownOpenForId);
                }
              }}
              className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/30 transition-all duration-200 flex items-center gap-2.5 group"
            >
              <Trash2 className="w-4 h-4 group-hover:text-red-300 transition-colors" />
              Delete
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// Individual conversation item
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isEditing?: boolean;
  editingTitle?: string;
  onTitleChange?: (title: string) => void;
  onStartRename?: () => void;
  onSaveRename?: () => void;
  onCancelRename?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  canRename?: boolean;
  onDelete?: (id: string) => void;
  onOpenDropdown?: (conversationId: string, buttonElement: HTMLElement) => void;
  onClick: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  isEditing = false,
  editingTitle = '',
  onTitleChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onKeyDown,
  canRename = false,
  onDelete,
  onOpenDropdown,
  onClick
}: ConversationItemProps) {
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
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group w-full px-4 py-3 flex items-start gap-3 transition-all duration-200 cursor-pointer ${isActive
          ? 'bg-gradient-to-r from-emerald-900/30 via-green-900/20 to-teal-900/20 border-l-4 border-l-emerald-500 shadow-sm'
          : 'hover:bg-gray-800/40 border-l-4 border-l-transparent hover:border-l-emerald-700'
        } border-b border-gray-700/20`}
    >
      {/* Avatar/Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 flex items-center justify-center text-2xl shadow-lg ring-2 ring-gray-700/50">
        {conversation.avatar_url ? (
          <img
            src={conversation.avatar_url}
            alt={conversation.title || 'Conversation'}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="drop-shadow-sm">{getConversationIcon()}</span>
        )}
      </div>

      {/* Conversation Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => onTitleChange?.(e.target.value)}
                  onKeyDown={onKeyDown}
                  onBlur={onSaveRename}
                  autoFocus
                  className="flex-1 text-sm font-semibold bg-gray-800 border border-green-500 rounded px-2 py-1 text-white focus:outline-none"
                />
                <button
                  onClick={onSaveRename}
                  className="p-1 hover:bg-green-900/30 rounded transition-colors"
                  title="Save"
                >
                  <Check className="w-3 h-3 text-green-400" />
                </button>
                <button
                  onClick={onCancelRename}
                  className="p-1 hover:bg-red-900/30 rounded transition-colors"
                  title="Cancel"
                >
                  <XIcon className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ) : (
              <h3
                className="font-semibold text-white truncate text-sm cursor-pointer hover:text-green-400 transition-colors relative group/title"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename?.();
                }}
                title={canRename ? 'Click to rename conversation' : undefined}
              >
                {conversation.title || 'Untitled Conversation'}
                {/* Tooltip */}
                {canRename && (
                  <span className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/title:opacity-100 transition-opacity pointer-events-none z-10">
                    Click to rename
                  </span>
                )}
              </h3>
            )}
          </div>

          {/* Right side: Date and Three-dot menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Date */}
            {!isEditing && conversation.last_message_at && (
              <span className="text-xs text-gray-400">
                {formatTimestamp(conversation.last_message_at, 'MMM d')}
              </span>
            )}

            {/* Three-dot menu - aligned consistently */}
            {!isEditing && (
              <div className="relative hidden md:block">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDropdown?.(conversation.id, e.currentTarget);
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
                  title="Conversation options"
                  aria-label="Conversation options"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Last Message Preview */}
        {conversation.last_message_preview && (
          <p className="text-sm text-gray-400 truncate mb-1">
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
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          )}
          {conversation.conversation_type !== 'direct' && (
            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full capitalize">
              {conversation.conversation_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}