'use client';

import { Clock, Check, CheckCheck, MoreVertical, MessageSquare, Pin, Forward, Edit3, Trash2 } from 'lucide-react';
import { MessageWithAttachments, MessageWithReplies, MessageReactionSummary, messagesService } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useEffect } from 'react';
import { AttachmentPreview } from './AttachmentPreview';
import { ReactionPicker } from './ReactionPicker';
import { MentionHighlight } from './MentionHighlight';
// Simple text sanitization to prevent XSS (avoid DOMPurify during build)
const stripTags = (str: string) => str.replace(/<[^>]*>/g, '').trim();

// Safe text rendering with basic formatting
const ReactMarkdown = ({ children }: { children: string }) => {
  // Sanitize the content by stripping HTML tags and replace newlines with spaces
  const sanitizedContent = stripTags(children).replace(/\n/g, ' ');

  return <span>{sanitizedContent}</span>;
};

interface MessageCardProps {
  message: MessageWithAttachments | MessageWithReplies;
  onEdit: (message: MessageWithAttachments) => void;
  onDelete: (messageId: string) => void;
  onMarkRead: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onForward?: (message: MessageWithAttachments | MessageWithReplies) => void;
  isOwn?: boolean;
  currentUserId?: string;
  partnerName?: string;
  partnerColor?: string;
  compact?: boolean;
  onReply?: (message: MessageWithAttachments | MessageWithReplies) => void;
  showReplyButton?: boolean;
}

export function MessageCard({
  message,
  onEdit,
  onDelete,
  onMarkRead,
  onTogglePin,
  onForward,
  isOwn = false,
  currentUserId,
  partnerName = 'Partner',
  partnerColor = '#34D399', // Default green color
  compact = false,
  onReply,
  showReplyButton = true
}: MessageCardProps) {
  const [reactions, setReactions] = useState<MessageReactionSummary[]>([]);
  const [loadingReaction, setLoadingReaction] = useState(false);

  // Mock user color (in real app, this would come from user profile)
  const userColor = '#3B82F6'; // Blue for current user

  const senderColor = isOwn ? userColor : partnerColor;
  const senderName = isOwn ? 'You' : partnerName;

  // Load reactions (only for real messages, not temporary ones)
  useEffect(() => {
    // Skip loading reactions for temporary messages
    if (message.id.startsWith('temp-')) {
      return;
    }

    async function loadReactions() {
      try {
        const reactionsData = await messagesService.getMessageReactions(message.id, currentUserId);
        setReactions(reactionsData);
      } catch (error) {
        console.error('Failed to load reactions:', error);
      }
    }

    loadReactions();
  }, [message.id, currentUserId]);

  // Handle adding reaction
  const handleAddReaction = async (emoji: string) => {
    if (!currentUserId || loadingReaction || message.id.startsWith('temp-')) return;

    setLoadingReaction(true);
    try {
      await messagesService.toggleReaction(message.id, currentUserId, emoji);
      // Reload reactions
      const reactionsData = await messagesService.getMessageReactions(message.id, currentUserId);
      setReactions(reactionsData);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    } finally {
      setLoadingReaction(false);
    }
  };

  // Helper function to get color classes based on sender color
  const getColorClasses = (color: string) => {
    if (isOwn) {
      return {
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-500',
      };
    } else {
      return {
        textColor: 'text-green-600 dark:text-green-400',
        borderColor: 'border-green-500',
      };
    }
  };

  const colorClasses = getColorClasses(senderColor);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender Name */}
        <div className="px-4 pb-1">
          <p className={`text-xs font-medium ${colorClasses.textColor}`}>
            {senderName}
          </p>
        </div>

        {/* Message Bubble */}
        <div className="relative group">
          <div
            className={`rounded-2xl px-4 py-3 ${
              isOwn
                ? 'rounded-tr-sm bg-blue-50 dark:bg-blue-900/20'
                : 'rounded-tl-sm bg-gray-50 dark:bg-gray-800'
            } border border-gray-200 dark:border-gray-700`}
          >
            {/* Message Content with Markdown Support */}
            {message.content && (
              <div className="break-words text-gray-900 dark:text-white text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Attachments */}
            {message.attachments_data && message.attachments_data.length > 0 && (
              <div className={`space-y-2 ${message.content ? 'mt-2' : ''}`}>
                {message.attachments_data.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    compact={compact}
                  />
                ))}
              </div>
            )}

            {/* Timestamp and Read Status */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTimestamp(message.created_at, 'h:mm a')}</span>
              {message.updated_at && message.updated_at !== message.created_at && (
                <span className="italic">(edited)</span>
              )}
              {isOwn && (
                <div className="ml-1 relative group/receipt">
                  {message.read ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 transition-colors" />
                      {message.read_at && (
                        <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/receipt:opacity-100 transition-opacity pointer-events-none z-10">
                          Read {formatTimestamp(message.read_at, 'MMM d, h:mm a')}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-colors" />
                      <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/receipt:opacity-100 transition-opacity pointer-events-none z-10">
                        Sent
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Reply Button - Subtle conversational design */}
            {showReplyButton && onReply && !message.parent_message_id && (
              <div className="mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
                <button
                  onClick={() => onReply(message)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  {('reply_count' in message && message.reply_count) ? (
                    <span>{message.reply_count}</span>
                  ) : null}
                </button>
              </div>
            )}

            {/* Reactions Display */}
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleAddReaction(reaction.emoji)}
                    disabled={loadingReaction}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      reaction.reacted_by_current_user
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
                {/* Add Reaction Button */}
                <ReactionPicker onSelectEmoji={handleAddReaction} />
              </div>
            )}

            {/* Add Reaction Button (when no reactions) */}
            {reactions.length === 0 && (
              <div className="mt-2 opacity-0 group-hover:opacity-60 transition-opacity">
                <ReactionPicker onSelectEmoji={handleAddReaction} />
              </div>
            )}

            {/* Message Actions - Truly Hidden by Default */}
            {isOwn && (
              <div className="absolute -top-1 -right-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 delay-150">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(message)}
                    title="Edit message"
                    aria-label="Edit message"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/95 dark:bg-gray-800/95 border border-gray-200/70 dark:border-gray-600/70 shadow-md hover:shadow-lg hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all duration-200 group/edit"
                  >
                    <Edit3 className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover/edit:text-blue-600 dark:group-hover/edit:text-blue-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => onDelete(message.id)}
                    title="Delete message"
                    aria-label="Delete message"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/95 dark:bg-gray-800/95 border border-gray-200/70 dark:border-gray-600/70 shadow-md hover:shadow-lg hover:bg-red-50 dark:hover:bg-red-900/40 transition-all duration-200 group/delete"
                  >
                    <Trash2 className="w-3 h-3 text-gray-500 dark:text-gray-400 group-hover/delete:text-red-600 dark:group-hover/delete:text-red-400 transition-colors" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
