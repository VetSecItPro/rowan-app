/**
 * ChatMessage — Single chat message bubble
 *
 * Renders user and assistant messages with:
 * - Markdown-rendered assistant text
 * - Feature-colored tool results
 * - Typing indicator while streaming
 * - Inline confirmation cards
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types/chat';
import ConfirmationCard from './ConfirmationCard';
import MarkdownMessage from './MarkdownMessage';
import TypingIndicator from './TypingIndicator';

interface ChatMessageProps {
  message: ChatMessageType;
  conversationId?: string;
  onConfirm?: (actionId: string, confirmed: boolean) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
}

/** Displays a single AI chat message with markdown rendering and action buttons. */
export default function ChatMessage({ message, conversationId: _conversationId, onConfirm, onFeedback }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [localFeedback, setLocalFeedback] = useState<'positive' | 'negative' | null>(message.feedback ?? null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    // Toggle off if clicking the same feedback
    if (localFeedback === type) return;
    setLocalFeedback(type);
    onFeedback?.(message.id, type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-gray-700'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[80%] flex flex-col gap-2 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Text bubble */}
        {message.content && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-700/80 text-gray-100 rounded-bl-md'
            }`}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <MarkdownMessage
                content={message.content}
                isStreaming={message.isStreaming}
              />
            )}
          </div>
        )}

        {/* Streaming indicator with no text yet */}
        {message.isStreaming && !message.content && (
          <div className="bg-gray-700/80 rounded-2xl rounded-bl-md px-4 py-3">
            <TypingIndicator />
          </div>
        )}

        {/* Confirmation card */}
        {message.confirmation && onConfirm && (
          <ConfirmationCard
            confirmation={message.confirmation}
            onConfirm={(confirmed) =>
              onConfirm(message.confirmation!.id, confirmed)
            }
          />
        )}

        {/* Result badge */}
        {message.result && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
              message.result.success
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-red-500/20 text-red-300'
            }`}
          >
            <span>{message.result.success ? 'Done' : 'Failed'}:</span>
            <span>{message.result.message}</span>
          </div>
        )}

        {/* Feedback buttons — only for assistant messages with content, not streaming */}
        {!isUser && message.content && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={() => handleFeedback('positive')}
              className={`p-1 rounded-md transition-colors ${
                localFeedback === 'positive'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              aria-label="Helpful"
              title="Helpful"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              className={`p-1 rounded-md transition-colors ${
                localFeedback === 'negative'
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
              aria-label="Not helpful"
              title="Not helpful"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
