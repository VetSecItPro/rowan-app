'use client';

import { Clock, Check, CheckCheck, MoreVertical, MessageSquare, Pin, Forward } from 'lucide-react';
import { MessageWithAttachments, MessageWithReplies, MessageReactionSummary, messagesService } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useEffect } from 'react';
import { AttachmentPreview } from './AttachmentPreview';
import { ReactionPicker } from './ReactionPicker';
import { MentionHighlight } from './MentionHighlight';
// Temporary fix: Remove ReactMarkdown import to fix build issues
// TODO: Re-add ReactMarkdown after fixing dependencies
const ReactMarkdown = ({ children }: { children: string }) => <span dangerouslySetInnerHTML={{ __html: children.replace(/\n/g, '<br>') }} />;

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
  const [showMenu, setShowMenu] = useState(false);
  const [reactions, setReactions] = useState<MessageReactionSummary[]>([]);
  const [loadingReaction, setLoadingReaction] = useState(false);

  // Mock user color (in real app, this would come from user profile)
  const userColor = '#3B82F6'; // Blue for current user

  const senderColor = isOwn ? userColor : partnerColor;
  const senderName = isOwn ? 'You' : partnerName;

  // Load reactions
  useEffect(() => {
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
    if (!currentUserId || loadingReaction) return;

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

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender Name */}
        <div className="px-4 pb-1">
          <p className="text-xs font-medium" style={{ color: senderColor }}>
            {senderName}
          </p>
        </div>

        {/* Message Bubble with Glassmorphism */}
        <div className="relative group">
          <div
            className={`rounded-2xl px-4 py-3 ${
              isOwn
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            } backdrop-blur-md border-2 shadow-lg bg-white/40 dark:bg-gray-800/40`}
            style={{
              borderColor: `${senderColor}`,
              boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.1)`
            }}
          >
            {/* Message Content with Markdown Support */}
            {message.content && (
              <div className="break-words text-gray-900 dark:text-white text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
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

            {/* Reply Button - Elegant hover-only design */}
            {showReplyButton && onReply && !message.parent_message_id && (
              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => onReply(message)}
                  className="btn-touch flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 active:scale-95"
                >
                  <MessageSquare className="w-3 h-3" />
                  {('reply_count' in message && message.reply_count) ? (
                    <span className="font-medium">{message.reply_count}</span>
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
                    className={`btn-touch flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all active:scale-95 ${
                      reaction.reacted_by_current_user
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={`${reaction.count} ${reaction.count === 1 ? 'reaction' : 'reactions'}`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {reaction.count}
                    </span>
                  </button>
                ))}
                {/* Add Reaction Button */}
                <ReactionPicker onSelectEmoji={handleAddReaction} />
              </div>
            )}

            {/* Add Reaction Button (when no reactions) */}
            {reactions.length === 0 && (
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ReactionPicker onSelectEmoji={handleAddReaction} />
              </div>
            )}

            {/* More Menu */}
            {isOwn && (
              <div className="absolute -top-1 -right-1">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  title="Edit or Delete"
                  aria-label="Message options menu"
                  className="btn-touch w-12 h-12 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                >
                  <MoreVertical className="w-5 h-5 md:w-4 md:h-4 text-gray-600 dark:text-gray-400" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-40 dropdown-mobile bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          onEdit(message);
                          setShowMenu(false);
                        }}
                        className="btn-touch w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg active:scale-[0.98]"
                      >
                        Edit
                      </button>
                      {onTogglePin && (
                        <button
                          onClick={() => {
                            onTogglePin(message.id);
                            setShowMenu(false);
                          }}
                          className="btn-touch w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] flex items-center gap-2"
                        >
                          <Pin className={`w-3.5 h-3.5 ${message.is_pinned ? 'rotate-45' : ''}`} />
                          {message.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                      {onForward && (
                        <button
                          onClick={() => {
                            onForward(message);
                            setShowMenu(false);
                          }}
                          className="btn-touch w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] flex items-center gap-2"
                        >
                          <Forward className="w-3.5 h-3.5" />
                          Forward
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onDelete(message.id);
                          setShowMenu(false);
                        }}
                        className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg active:scale-[0.98]"
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
