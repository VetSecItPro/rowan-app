'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { MessageWithAttachments, MessageWithReplies } from '@/lib/services/messages-service';
import { messagesService } from '@/lib/services/messages-service';
import { MessageCard } from './MessageCard';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface ThreadViewProps {
  parentMessage: MessageWithReplies;
  conversationId: string;
  spaceId: string;
  currentUserId: string;
  partnerName?: string;
  partnerColor?: string;
  onClose: () => void;
}

export function ThreadView({
  parentMessage,
  conversationId,
  spaceId,
  currentUserId,
  partnerName = 'Partner',
  partnerColor = '#34D399',
  onClose,
}: ThreadViewProps) {
  const [replies, setReplies] = useState<MessageWithAttachments[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const scrollToBottom = useCallback(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load thread replies
  useEffect(() => {
    let isMounted = true;

    async function loadReplies() {
      try {
        const data = await messagesService.getThreadReplies(parentMessage.id);
        if (isMounted) {
          setReplies(data);
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      } catch (error) {
        if (isMounted) {
          logger.error('Failed to load replies:', error, { component: 'ThreadView', action: 'component_action' });
          toast.error('Failed to load replies');
          setLoading(false);
        }
      }
    }

    loadReplies();

    return () => {
      isMounted = false;
    };
  }, [parentMessage.id, scrollToBottom]);

  // Subscribe to real-time updates for replies
  useEffect(() => {
    const channel = messagesService.subscribeToMessages(conversationId, {
      onInsert: (newMessage) => {
        // Only add if it's a reply to this parent
        if (newMessage.parent_message_id === parentMessage.id) {
          setReplies((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage as MessageWithAttachments];
          });
          setTimeout(scrollToBottom, 100);
        }
      },
      onUpdate: (updatedMessage) => {
        if (updatedMessage.parent_message_id === parentMessage.id) {
          setReplies((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? updatedMessage as MessageWithAttachments : m))
          );
        }
      },
      onDelete: (messageId) => {
        setReplies((prev) => prev.filter((m) => m.id !== messageId));
      },
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        messagesService.unsubscribe(channelRef.current);
      }
    };
  }, [conversationId, parentMessage.id, scrollToBottom]);

  const handleSendReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!replyInput.trim() || sending) return;

      setSending(true);

      try {
        await messagesService.createReply({
          space_id: spaceId,
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: replyInput.trim(),
          parent_message_id: parentMessage.id,
        });

        setReplyInput('');
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        logger.error('Failed to send reply:', error, { component: 'ThreadView', action: 'component_action' });
        toast.error('Failed to send reply');
      } finally {
        setSending(false);
      }
    },
    [replyInput, sending, spaceId, conversationId, currentUserId, parentMessage.id, scrollToBottom]
  );

  const handleEditReply = useCallback(
    (message: MessageWithAttachments) => {
      setReplyInput(message.content);
      // TODO: Implement edit mode
      toast.info('Edit functionality coming soon');
    },
    []
  );

  const handleDeleteReply = useCallback(async (messageId: string) => {
    try {
      await messagesService.deleteMessage(messageId);
      toast.success('Reply deleted');
    } catch (error) {
      logger.error('Failed to delete reply:', error, { component: 'ThreadView', action: 'component_action' });
      toast.error('Failed to delete reply');
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      {/* Thread Container */}
      <div className="bg-white dark:bg-gray-900 w-full h-full sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thread</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close thread"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Thread Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Parent Message */}
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <MessageCard
              message={parentMessage}
              onEdit={() => toast.info('Edit parent message not supported in thread view')}
              onDelete={() => toast.info('Delete parent message not supported in thread view')}
              onMarkRead={() => {}}
              isOwn={parentMessage.sender_id === currentUserId}
              currentUserId={currentUserId}
              partnerName={partnerName}
              partnerColor={partnerColor}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Replies */}
          {!loading && replies.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No replies yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Be the first to reply
              </p>
            </div>
          )}

          {!loading && replies.length > 0 && (
            <div className="space-y-4">
              {replies.map((reply) => (
                <MessageCard
                  key={reply.id}
                  message={reply}
                  onEdit={handleEditReply}
                  onDelete={handleDeleteReply}
                  onMarkRead={() => {}}
                  isOwn={reply.sender_id === currentUserId}
                  currentUserId={currentUserId}
                  partnerName={partnerName}
                  partnerColor={partnerColor}
                  compact
                />
              ))}
            </div>
          )}

          {/* Scroll Anchor */}
          <div ref={repliesEndRef} />
        </div>

        {/* Reply Input */}
        <form
          onSubmit={handleSendReply}
          className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              disabled={sending}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!replyInput.trim() || sending}
              className="w-12 h-12 flex items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors active:scale-95"
              aria-label="Send reply"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
