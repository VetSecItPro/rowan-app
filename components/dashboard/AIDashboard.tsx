/**
 * AIDashboard — AI-first dashboard with inline chat, briefing, and suggestions
 *
 * Full-page view that replaces the traditional dashboard. Reuses all chat
 * components from ChatPanel (ChatMessage, ChatInput, QuickActions,
 * MorningBriefing, SuggestionCards) but rendered inline rather than in a
 * slide-over panel.
 *
 * Consumes ChatContext for shared state so it shares the same conversation
 * with ChatPanel / ChatFAB / BottomNav.
 */

'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, LayoutDashboard } from 'lucide-react';
import { useChatContext } from '@/lib/contexts/chat-context';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import ChatMessage from '@/components/chat/ChatMessage';
import ChatInput from '@/components/chat/ChatInput';
import QuickActions from '@/components/chat/QuickActions';
import MorningBriefing from '@/components/chat/MorningBriefing';
import SuggestionCards from '@/components/chat/SuggestionCards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AIDashboardProps {
  onSwitchToTraditional: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIDashboard({ onSwitchToTraditional }: AIDashboardProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    pendingAction,
    error,
    sendMessage,
    confirmAction,
    stopStreaming,
    clearError,
    suggestions,
    dismissSuggestion,
    briefing,
    dismissBriefing,
  } = useChatContext();

  const { user } = useAuthWithSpaces();
  const scrollRef = useRef<HTMLDivElement>(null);

  // First name for greeting
  const firstName = useMemo(() => {
    if (!user?.name) return '';
    return user.name.split(' ')[0];
  }, [user?.name]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendFromBriefing = useCallback(
    (message: string) => {
      sendMessage(message);
    },
    [sendMessage]
  );

  const hasMessages = messages.length > 0;
  const hasBriefing = !!briefing;
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4.5rem)]">
      {/* Top bar: greeting + toggle */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-800/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-white truncate">
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-xs text-gray-500">{formatDate()}</p>
          </div>
        </div>

        <button
          onClick={onSwitchToTraditional}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors shrink-0"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Classic View</span>
        </button>
      </div>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Briefing card */}
        <AnimatePresence>
          {hasBriefing && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
              <MorningBriefing
                briefing={briefing!}
                onAskRowan={handleSendFromBriefing}
                onDismiss={dismissBriefing}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestion cards */}
        <AnimatePresence>
          {hasSuggestions && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              <SuggestionCards
                suggestions={suggestions}
                onAction={sendMessage}
                onDismiss={dismissSuggestion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state (no messages yet) */}
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              What can I help with today?
            </h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Ask me about your tasks, meals, calendar, budget, or anything else.
              I can create, update, and manage things for you.
            </p>
          </div>
        )}

        {/* Chat messages */}
        {hasMessages && (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onConfirm={pendingAction ? confirmAction : undefined}
              />
            ))}
          </div>
        )}

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <span className="text-sm text-red-400 flex-1">{error}</span>
              <button
                onClick={clearError}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom: Quick actions + input */}
      <div className="border-t border-gray-800/50 px-4 sm:px-6 py-3 space-y-3">
        {!hasMessages && (
          <QuickActions onSend={sendMessage} />
        )}
        <ChatInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isLoading={isLoading}
          isStreaming={isStreaming}
          disabled={!!pendingAction}
          placeholder="Ask Rowan anything..."
        />
      </div>
    </div>
  );
}
