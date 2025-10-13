'use client';

import { Clock, Check, CheckCheck, MoreVertical } from 'lucide-react';
import { Message } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface MessageCardProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onMarkRead: (messageId: string) => void;
  isOwn?: boolean;
  currentUserId?: string;
  partnerName?: string;
  partnerColor?: string;
}

export function MessageCard({
  message,
  onEdit,
  onDelete,
  onMarkRead,
  isOwn = false,
  currentUserId,
  partnerName = 'Partner',
  partnerColor = '#34D399' // Default green color
}: MessageCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Mock user color (in real app, this would come from user profile)
  const userColor = '#3B82F6'; // Blue for current user

  const senderColor = isOwn ? userColor : partnerColor;
  const senderName = isOwn ? 'You' : partnerName;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender Name */}
        <div className="px-4 pb-1">
          <p className="text-xs font-medium" style={{ color: senderColor }}>
            {senderName}
          </p>
        </div>

        {/* Message Bubble */}
        <div className="relative group">
          <div
            className={`rounded-2xl px-4 py-3 ${
              isOwn
                ? 'rounded-tr-sm bg-gray-50 dark:bg-gray-800'
                : 'rounded-tl-sm bg-gray-50 dark:bg-gray-800'
            }`}
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: senderColor
            }}
          >
            {/* Message Content */}
            <p className="break-words whitespace-pre-wrap text-gray-900 dark:text-white text-sm">
              {message.content}
            </p>

            {/* Timestamp and Read Status */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTimestamp(message.created_at, 'h:mm a')}</span>
              {message.updated_at && message.updated_at !== message.created_at && (
                <span className="italic">(edited)</span>
              )}
              {isOwn && (
                <span className="ml-1">
                  {message.read ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </span>
              )}
            </div>

            {/* More Menu */}
            {isOwn && (
              <div className="absolute -top-1 -right-1">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  title="Edit or Delete"
                  aria-label="Message options menu"
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          onEdit(message);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onDelete(message.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
