/**
 * ChatMessage — Single chat message bubble
 *
 * Renders user and assistant messages with:
 * - Feature-colored tool results
 * - Streaming text cursor
 * - Inline confirmation cards
 */

'use client';

import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types/chat';
import { FEATURE_COLORS } from '@/lib/types/chat';
import ConfirmationCard from './ConfirmationCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onConfirm?: (actionId: string, confirmed: boolean) => void;
}

export default function ChatMessage({ message, onConfirm }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
            <span className="whitespace-pre-wrap">{message.content}</span>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/60 animate-pulse rounded-sm" />
            )}
          </div>
        )}

        {/* Streaming indicator with no text yet */}
        {message.isStreaming && !message.content && (
          <div className="bg-gray-700/80 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
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
      </div>
    </motion.div>
  );
}
