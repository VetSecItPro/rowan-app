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
    <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {messages.length} Pinned {messages.length === 1 ? 'Message' : 'Messages'}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-amber-100 dark:hover:bg-amber-800/50 rounded transition-colors"
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
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-amber-100/50 dark:hover:bg-amber-800/30 transition-colors border-b border-amber-100 dark:border-amber-900/50 last:border-b-0"
            >
              {/* Pin Icon */}
              <div className="flex-shrink-0 mt-1">
                <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400 rotate-45" />
              </div>

              {/* Message Content */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onMessageClick?.(message.id)}
              >
                <p className="text-sm text-gray-900 dark:text-white break-words line-clamp-2">
                  <MentionHighlight content={message.content} currentUserId={currentUserId} />
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-amber-700 dark:text-amber-300">
                  <span>{formatTimestamp(message.created_at, 'MMM d, h:mm a')}</span>
                  {message.pinned_at && (
                    <>
                      <span>•</span>
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
                className="flex-shrink-0 p-1.5 hover:bg-amber-200 dark:hover:bg-amber-700 rounded transition-colors group"
                title="Unpin message"
                aria-label="Unpin this message"
              >
                <X className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-200" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
