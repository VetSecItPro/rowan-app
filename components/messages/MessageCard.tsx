'use client';

import { MessageCircle, Clock, Check, CheckCheck, MoreVertical } from 'lucide-react';
import { Message } from '@/lib/services/messages-service';
import { format } from 'date-fns';
import { useState } from 'react';

interface MessageCardProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onMarkRead: (messageId: string) => void;
  isOwn?: boolean;
}

export function MessageCard({ message, onEdit, onDelete, onMarkRead, isOwn = false }: MessageCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className={`relative group rounded-xl p-4 ${
          isOwn
            ? 'bg-gradient-messages text-white'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
        }`}>
          {/* Message Content */}
          <p className="break-words">{message.content}</p>

          {/* Timestamp and Read Status */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${
            isOwn ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
          }`}>
            <Clock className="w-3 h-3" />
            <span>{format(new Date(message.created_at), 'h:mm a')}</span>
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
            <div className="absolute top-2 right-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
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
  );
}
