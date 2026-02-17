/**
 * ChatPanel — Main chat interface panel
 *
 * Two rendering modes:
 * - **Persistent** (desktop lg+): Static right column in the flex layout.
 *   No animation, no backdrop, no close button. Always visible.
 * - **Overlay** (mobile/tablet): Slide-in from right with backdrop.
 *   Toggled open/closed via BottomNav or Sidebar button.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Bot } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/contexts/auth-context';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import ErrorBanner from './ErrorBanner';
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
  /** Whether voice input is enabled in user settings */
  voiceEnabled?: boolean;
  /** When true, renders as a static in-flow column (desktop persistent mode) */
  persistent?: boolean;
}

/** Renders the full AI chat panel with message history, input, and suggestions. */
export default function ChatPanel({
  spaceId,
  isOpen,
  onClose,
  onNewAssistantMessage,
  voiceEnabled,
  persistent,
}: ChatPanelProps) {
  const {
    messages,
    conversationId,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    stopStreaming,
    clearError,
  } = useChat(spaceId);

  const { user } = useAuth();
  const { suggestions, dismiss: dismissSuggestion } = useAISuggestions(spaceId);
  const { briefing, dismiss: dismissBriefing } = useAIBriefing(spaceId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  // Derive whether a retry is possible from messages (safe to read during render)
  const hasLastUserMessage = messages.some((m) => m.role === 'user' && m.content);

  // Track the last user message for retry
  useEffect(() => {
    const userMessages = messages.filter((m) => m.role === 'user');
    const last = userMessages[userMessages.length - 1];
    if (last?.content) {
      lastUserMessageRef.current = last.content;
    }
  }, [messages]);

  // Notify parent when a new assistant message arrives while panel is closed
  const effectiveIsOpen = persistent || isOpen;
  useEffect(() => {
    if (!effectiveIsOpen && messages.length > prevMessageCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest?.role === 'assistant' && !newest.isStreaming && newest.content) {
        onNewAssistantMessage?.();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, effectiveIsOpen, onNewAssistantMessage]);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleRetry = useCallback(() => {
    if (lastUserMessageRef.current) {
      clearError();
      sendMessage(lastUserMessageRef.current);
    }
  }, [clearError, sendMessage]);

  const handleFeedback = useCallback(async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, conversationId, feedback }),
      });
    } catch {
      // Silently fail — feedback is non-critical
    }
  }, [conversationId]);

  // ── Shared inner content (used by both persistent and overlay modes) ──

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-white">Rowan AI</h2>
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
          {!persistent && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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

        {messages.length === 0 && <EmptyState onSend={sendMessage} userName={user?.name} />}

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
              conversationId={conversationId}
              onFeedback={handleFeedback}
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
            onRetry={hasLastUserMessage ? handleRetry : undefined}
          />
        )}
      </AnimatePresence>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isLoading={isLoading}
        isStreaming={isStreaming}
        disabled={false}
        voiceEnabled={voiceEnabled}
      />
    </>
  );

  // ── Persistent mode: static in-flow column ──

  if (persistent) {
    return (
      <div className="flex flex-col h-full bg-gray-900 border border-gray-700/30 rounded-xl overflow-hidden">
        {panelContent}
      </div>
    );
  }

  // ── Overlay mode: slide-in panel with backdrop ──

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
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col bg-gray-900 border-l border-gray-700/50 shadow-2xl"
          >
            {panelContent}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
