'use client';

import { Clock, Check, CheckCheck, MoreVertical, MessageSquare, Pin, Forward, Edit3, Trash2 } from 'lucide-react';
import { MessageWithAttachments, MessageWithReplies, MessageReactionSummary, messagesService } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useEffect } from 'react';
import { AttachmentPreview } from './AttachmentPreview';
import { ReactionPicker } from './ReactionPicker';
import { MentionHighlight } from './MentionHighlight';
import { logger } from '@/lib/logger';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
        logger.error('Failed to load reactions:', error, { component: 'MessageCard', action: 'component_action' });
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
      logger.error('Failed to add reaction:', error, { component: 'MessageCard', action: 'component_action' });
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

  // Check if message is long (more than ~200 characters or 3-4 lines)
  const isLongMessage = message.content && message.content.length > 200;
  const shouldTruncate = isLongMessage && !isExpanded;
  const displayContent = shouldTruncate
    ? message.content.substring(0, 200) + '...'
    : message.content;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender Name */}
        <div className="px-4 pb-1">
          <p className={`text-xs font-medium ${colorClasses.textColor}`}>
            {senderName}
          </p>
        </div>

        {/* Message Bubble with Enhanced Glassmorphism */}
        <div className="relative group/message z-10 w-fit">
          <div
            className={`relative rounded-2xl cursor-pointer backdrop-blur-lg backdrop-saturate-150 ${
              // Dynamic padding based on content length
              message.content && message.content.length < 20
                ? 'px-4 py-2.5' // Small padding for short messages
                : message.content && message.content.length < 80
                ? 'px-4 py-3' // Medium padding
                : 'px-5 py-3.5' // Full padding for longer messages
            } ${
              isOwn
                ? 'bg-gradient-to-br from-blue-500/20 via-blue-400/15 to-indigo-500/10 dark:from-blue-500/25 dark:via-blue-400/20 dark:to-indigo-500/15 border border-blue-300/30 dark:border-blue-400/25 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/15 dark:hover:shadow-blue-500/10 hover:border-blue-300/50 dark:hover:border-blue-400/40 ring-1 ring-white/20 dark:ring-white/5'
                : 'bg-gradient-to-br from-white/60 via-white/50 to-gray-100/40 dark:from-gray-700/50 dark:via-gray-600/40 dark:to-gray-700/30 border border-white/40 dark:border-gray-500/30 shadow-lg shadow-gray-500/10 dark:shadow-black/20 hover:shadow-xl hover:shadow-gray-500/15 dark:hover:shadow-black/30 hover:border-white/60 dark:hover:border-gray-500/40 ring-1 ring-white/30 dark:ring-white/5'
            } transition-all duration-300 ease-out`}
          >
            {/* Message Content with Markdown Support and Expand/Collapse */}
            {message.content && (
              <div className="relative z-10 break-words text-gray-900 dark:text-white text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {displayContent}
                </ReactMarkdown>
                {isLongMessage && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Attachments */}
            {message.attachments_data && message.attachments_data.length > 0 && (
              <div className={`relative z-10 space-y-2 ${message.content ? 'mt-2' : ''}`}>
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
            <div className="relative z-10 flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
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
              <div className="relative z-10 mt-1 opacity-0 group-hover/message:opacity-60 transition-opacity">
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

            {/* Reactions Display - Glassmorphism Pills */}
            {reactions.length > 0 && (
              <div className="relative z-10 flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/10 dark:border-gray-600/20">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleAddReaction(reaction.emoji)}
                    disabled={loadingReaction}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm transition-all duration-200 ${
                      reaction.reacted_by_current_user
                        ? 'bg-blue-500/20 dark:bg-blue-400/25 text-blue-700 dark:text-blue-300 border border-blue-300/40 dark:border-blue-400/30 shadow-sm shadow-blue-500/10'
                        : 'bg-white/30 dark:bg-gray-600/30 text-gray-700 dark:text-gray-300 border border-white/30 dark:border-gray-500/30 hover:bg-white/50 dark:hover:bg-gray-600/50 hover:border-white/50 dark:hover:border-gray-500/50'
                    }`}
                    title={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
                  >
                    <span className="text-sm">{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Message Actions - Glassmorphism Floating Toolbar */}
          <div className={`absolute -top-12 z-[100] opacity-0 invisible group-hover/message:opacity-100 group-hover/message:visible hover:opacity-100 hover:visible transition-all duration-300 ease-out pointer-events-none ${
            isOwn ? 'left-0' : 'right-0'
          }`}>
              <div className="flex items-center gap-0.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl backdrop-saturate-150 rounded-full shadow-xl shadow-black/10 dark:shadow-black/30 border border-white/50 dark:border-gray-600/50 p-1 pointer-events-auto ring-1 ring-black/5 dark:ring-white/5">
                {/* Edit Button - Always show for own messages, or if user has edit permissions */}
                {isOwn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(message);
                    }}
                    title="Edit message"
                    aria-label="Edit message"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all duration-200 group/edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 group-hover/edit:text-blue-600 dark:group-hover/edit:text-blue-400 transition-colors" />
                  </button>
                )}

                {/* Delete Button - Show for own messages or if user has delete permissions */}
                {isOwn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(message.id);
                    }}
                    title="Delete message"
                    aria-label="Delete message"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 transition-all duration-200 group/delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 group-hover/delete:text-red-600 dark:group-hover/delete:text-red-400 transition-colors" />
                  </button>
                )}

                {/* Pin Button - If pin functionality is available */}
                {onTogglePin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(message.id);
                    }}
                    title="Pin message"
                    aria-label="Pin message"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/40 transition-all duration-200 group/pin"
                  >
                    <Pin className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 group-hover/pin:text-yellow-600 dark:group-hover/pin:text-yellow-400 transition-colors" />
                  </button>
                )}

                {/* Forward Button - If forward functionality is available */}
                {onForward && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onForward(message);
                    }}
                    title="Forward message"
                    aria-label="Forward message"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-green-50 dark:hover:bg-green-900/40 transition-all duration-200 group/forward"
                  >
                    <Forward className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 group-hover/forward:text-green-600 dark:group-hover/forward:text-green-400 transition-colors" />
                  </button>
                )}

                {/* Add Reaction Button - Emoji Picker */}
                {!message.id.startsWith('temp-') && (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <ReactionPicker onSelectEmoji={handleAddReaction} />
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
