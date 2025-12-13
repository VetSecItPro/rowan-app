'use client';

import { useState } from 'react';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MessageWithAttachments } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { MentionHighlight } from './MentionHighlight';

interface PinnedMessagesProps {
  messages: MessageWithAttachments[];
  onUnpin: (messageId: string) => void;
  onMessageClick?: (messageId: string) => void;
  currentUserId?: string;
}

export function PinnedMessages({
  messages,
  onUnpin,
  onMessageClick,
  currentUserId,
}: PinnedMessagesProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (messages.length === 0) {
    return null;
  }

  const visibleMessages = isCollapsed ? [] : messages;

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100/60 via-yellow-50/50 to-orange-50/40 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-orange-900/20 backdrop-blur-lg border border-amber-200/40 dark:border-amber-700/30 shadow-lg shadow-amber-500/10 dark:shadow-amber-900/20 ring-1 ring-white/20 dark:ring-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/40 dark:border-amber-700/30 bg-gradient-to-r from-amber-200/30 to-yellow-200/20 dark:from-amber-800/20 dark:to-yellow-800/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
            <Pin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {messages.length} Pinned {messages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-700/40 rounded-lg transition-all duration-200 backdrop-blur-sm"
          aria-label={isCollapsed ? 'Expand pinned messages' : 'Collapse pinned messages'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          ) : (
            <ChevronUp className="w-4 h-4 text-amber-700 dark:text-amber-300" />
          )}
        </button>
      </div>

      {/* Pinned Messages List */}
      {!isCollapsed && (
        <div className="max-h-64 overflow-y-auto">
          {visibleMessages.map((message, index) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-amber-100/40 dark:hover:bg-amber-800/20 transition-all duration-200 ${
                index !== visibleMessages.length - 1 ? 'border-b border-amber-200/30 dark:border-amber-700/20' : ''
              }`}
            >
              {/* Pin Icon */}
              <div className="flex-shrink-0 mt-1">
                <Pin className="w-4 h-4 text-amber-500 dark:text-amber-400 rotate-45" />
              </div>

              {/* Message Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer group"
                onClick={() => onMessageClick?.(message.id)}
              >
                <p className="text-sm text-gray-800 dark:text-gray-100 break-words line-clamp-2 group-hover:text-amber-900 dark:group-hover:text-amber-100 transition-colors">
                  <MentionHighlight content={message.content} currentUserId={currentUserId} />
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span>{formatTimestamp(message.created_at, 'MMM d, h:mm a')}</span>
                  {message.pinned_at && (
                    <>
                      <span className="text-amber-400 dark:text-amber-500">•</span>
                      <span>Pinned {formatTimestamp(message.pinned_at, 'MMM d')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Unpin Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(message.id);
                }}
                className="flex-shrink-0 p-1.5 hover:bg-red-100/60 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 group/unpin"
                title="Unpin message"
                aria-label="Unpin this message"
              >
                <X className="w-4 h-4 text-amber-500 dark:text-amber-400 group-hover/unpin:text-red-600 dark:group-hover/unpin:text-red-400 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
