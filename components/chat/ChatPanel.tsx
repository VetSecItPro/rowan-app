/**
 * ChatPanel — Main chat interface panel
 *
 * Slide-in panel from the right side with:
 * - Auto-scrolling message list
 * - Streaming text display
 * - Confirmation flow for tool calls
 * - Empty state with example prompts
 * - Error banner with retry
 * - New conversation button
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Bot } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import ErrorBanner from './ErrorBanner';
import QuickActions from './QuickActions';
import SuggestionCards from './SuggestionCards';
import MorningBriefing from './MorningBriefing';
import { useAISuggestions } from '@/lib/hooks/useAISuggestions';
import { useAIBriefing } from '@/lib/hooks/useAIBriefing';

interface ChatPanelProps {
  spaceId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Callback when a new assistant message arrives (for unread badge) */
  onNewAssistantMessage?: () => void;
}

export default function ChatPanel({
  spaceId,
  isOpen,
  onClose,
  onNewAssistantMessage,
}: ChatPanelProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    pendingAction,
    error,
    sendMessage,
    confirmAction,
    clearChat,
    stopStreaming,
    clearError,
  } = useChat(spaceId);

  const { suggestions, dismiss: dismissSuggestion } = useAISuggestions(spaceId);
  const { briefing, dismiss: dismissBriefing } = useAIBriefing(spaceId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  // Track the last user message for retry
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const last = userMessages[userMessages.length - 1];
    if (last?.content) {
      lastUserMessageRef.current = last.content;
    }
  }, [messages]);

  // Notify parent when a new assistant message arrives while panel is closed
  useEffect(() => {
    if (!isOpen && messages.length > prevMessageCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest?.role === 'assistant' && !newest.isStreaming && newest.content) {
        onNewAssistantMessage?.();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isOpen, onNewAssistantMessage]);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConfirm = (actionId: string, confirmed: boolean) => {
    confirmAction(actionId, confirmed);
  };

  const handleRetry = useCallback(() => {
    if (lastUserMessageRef.current) {
      clearError();
      sendMessage(lastUserMessageRef.current);
    }
  }, [clearError, sendMessage]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[440px] flex flex-col bg-gray-900 border-l border-gray-700/50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Rowan</h2>
                  <p className="text-xs text-gray-400">AI Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            >
              {/* Morning briefing — shown above empty state */}
              {briefing && messages.length === 0 && (
                <MorningBriefing
                  briefing={briefing}
                  onAskRowan={sendMessage}
                  onDismiss={dismissBriefing}
                />
              )}

              {messages.length === 0 && <EmptyState onSend={sendMessage} />}

              {/* Proactive suggestions */}
              {suggestions.length > 0 && messages.length === 0 && (
                <div className="mb-2">
                  <SuggestionCards
                    suggestions={suggestions}
                    onAction={sendMessage}
                    onDismiss={dismissSuggestion}
                  />
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onConfirm={handleConfirm}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <ErrorBanner
                  message={error}
                  onDismiss={clearError}
                  onRetry={lastUserMessageRef.current ? handleRetry : undefined}
                />
              )}
            </AnimatePresence>

            {/* Quick actions — show above input when conversation is empty */}
            {messages.length === 0 && (
              <div className="px-3 pb-1">
                <QuickActions onSend={sendMessage} />
              </div>
            )}

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onStop={stopStreaming}
              isLoading={isLoading}
              isStreaming={isStreaming}
              disabled={!!pendingAction}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
