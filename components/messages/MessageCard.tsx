'use client';

import { Check, CheckCheck, Pin, Forward, Edit3, Trash2, Ban } from 'lucide-react';
import { MessageWithAttachments, MessageWithReplies, MessageReactionSummary, messagesService } from '@/lib/services/messages-service';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState, useEffect } from 'react';
import { AttachmentPreview } from './AttachmentPreview';
import { ReactionPicker } from './ReactionPicker';
import { MentionHighlight } from './MentionHighlight';
import { logger } from '@/lib/logger';

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
  onTogglePin,
  onForward,
  isOwn = false,
  currentUserId,
  compact = false
}: MessageCardProps) {
  const [reactions, setReactions] = useState<MessageReactionSummary[]>([]);
  const [loadingReaction, setLoadingReaction] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Check if message was deleted for everyone
  const isDeleted = message.deleted_for_everyone || message.deleted_at;

  // Check if message is long (more than ~200 characters or 3-4 lines)
  const isLongMessage = message.content && message.content.length > 200;
  const shouldTruncate = isLongMessage && !isExpanded;
  const displayContent = shouldTruncate
    ? message.content.substring(0, 200) + '...'
    : message.content;

  // Render deleted message placeholder - WhatsApp style
  if (isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className={`relative px-3 py-2 rounded-2xl ${
          isOwn
            ? 'bg-emerald-600/50 rounded-tr-sm'
            : 'bg-gray-600 rounded-tl-sm'
        }`}>
          <div className={`flex items-center gap-2 italic ${
            isOwn ? 'text-emerald-100' : 'text-gray-400'
          }`}>
            <Ban className="w-4 h-4" />
            <span className="text-sm">This message was deleted</span>
          </div>
          <div className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
            isOwn ? 'text-emerald-200/70' : 'text-gray-500'
          }`}>
            <span>{formatTimestamp(message.created_at, 'h:mm a')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Message Bubble - WhatsApp Style */}
        <div className="relative group/message z-10 w-fit">
          {/* Bubble Tail */}
          <div
            className={`absolute top-0 w-3 h-3 ${
              isOwn
                ? '-right-1.5 bg-emerald-600'
                : '-left-1.5 bg-gray-700'
            }`}
            style={{
              clipPath: isOwn
                ? 'polygon(0 0, 100% 0, 0 100%)'
                : 'polygon(100% 0, 0 0, 100% 100%)'
            }}
          />
          <div
            className={`relative px-3 py-2 min-w-[80px] ${
              isOwn
                ? 'bg-emerald-600 rounded-2xl rounded-tr-sm'
                : 'bg-gray-700 rounded-2xl rounded-tl-sm shadow-sm'
            }`}
          >
            {/* Message Content */}
            {message.content && (
              <div className={`relative z-10 break-words text-[15px] leading-relaxed ${
                isOwn ? 'text-white' : 'text-white'
              }`}>
                <MentionHighlight content={displayContent} />
                {isLongMessage && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`mt-1 text-xs font-medium hover:underline ${
                      isOwn ? 'text-emerald-100' : 'text-emerald-400'
                    }`}
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

            {/* Timestamp and Read Status - WhatsApp Style (bottom right, inline) */}
            <div className={`relative z-10 flex items-center justify-end gap-1 mt-1 -mb-0.5 text-[11px] ${
              isOwn ? 'text-emerald-100/80' : 'text-gray-400'
            }`}>
              {message.updated_at && message.updated_at !== message.created_at && (
                <span className="italic mr-1">edited</span>
              )}
              <span>{formatTimestamp(message.created_at, 'h:mm a')}</span>
              {isOwn && (
                <div className="ml-0.5">
                  {message.read ? (
                    <CheckCheck className={`w-4 h-4 ${isOwn ? 'text-sky-200' : 'text-blue-500'}`} />
                  ) : (
                    <Check className={`w-4 h-4 ${isOwn ? 'text-emerald-200/70' : 'text-gray-400'}`} />
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Reactions Display - Floating below bubble */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => handleAddReaction(reaction.emoji)}
                  disabled={loadingReaction}
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    reaction.reacted_by_current_user
                      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                      : 'bg-gray-700 text-gray-300 border border-gray-600'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px]">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Message Actions - Glassmorphism Floating Toolbar */}
          <div className={`absolute -top-12 z-[100] opacity-0 invisible group-hover/message:opacity-100 group-hover/message:visible hover:opacity-100 hover:visible transition-all duration-300 ease-out pointer-events-none ${
            isOwn ? 'left-0' : 'right-0'
          }`}>
              <div className="flex items-center gap-0.5 bg-gray-800/95 rounded-full shadow-xl shadow-black/30 border border-gray-600/50 p-1 pointer-events-auto ring-1 ring-white/5">
                {/* Edit Button - Always show for own messages, or if user has edit permissions */}
                {isOwn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(message);
                    }}
                    title="Edit message"
                    aria-label="Edit message"
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-900/40 transition-all duration-200 group/edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-400 group-hover/edit:text-blue-600 group-hover/edit:text-blue-400 transition-colors" />
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
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-900/40 transition-all duration-200 group/delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover/delete:text-red-600 group-hover/delete:text-red-400 transition-colors" />
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
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-yellow-900/40 transition-all duration-200 group/pin"
                  >
                    <Pin className="w-3.5 h-3.5 text-gray-400 group-hover/pin:text-yellow-600 group-hover/pin:text-yellow-400 transition-colors" />
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
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-green-900/40 transition-all duration-200 group/forward"
                  >
                    <Forward className="w-3.5 h-3.5 text-gray-400 group-hover/forward:text-green-600 group-hover/forward:text-green-400 transition-colors" />
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
