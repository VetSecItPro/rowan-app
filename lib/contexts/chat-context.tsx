/**
 * ChatContext — Shared chat state for BottomNav, ChatFAB, AIDashboard, and ChatPanel
 *
 * Lifts useChat, useAISuggestions, and useAIBriefing into a context so all
 * chat-related UI surfaces share the same conversation and state.
 * Panel open/close and unread badge state also live here.
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { useAISuggestions } from '@/lib/hooks/useAISuggestions';
import { useAIBriefing } from '@/lib/hooks/useAIBriefing';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import type { ChatMessage, PendingAction } from '@/lib/types/chat';
import type { AISuggestion } from '@/lib/services/ai/suggestion-service';
import type { BriefingOutput } from '@/lib/services/ai/briefing-service';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface ChatContextValue {
  // Feature flag
  enabled: boolean;
  spaceId: string | undefined;

  // Panel state
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  hasUnread: boolean;

  // Chat state (from useChat)
  messages: ChatMessage[];
  conversationId: string;
  isLoading: boolean;
  isStreaming: boolean;
  pendingAction: PendingAction | null;
  error: string | null;
  sendMessage: (text: string) => void;
  confirmAction: (actionId: string, confirmed: boolean) => void;
  clearChat: () => void;
  stopStreaming: () => void;
  clearError: () => void;

  // Suggestions
  suggestions: AISuggestion[];
  dismissSuggestion: (id: string) => void;

  // Briefing
  briefing: BriefingOutput | null;
  dismissBriefing: () => void;

  // New assistant message handler (for unread tracking)
  handleNewAssistantMessage: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

/**
 * Safe version that returns null when outside provider.
 * Used by components that may render outside the main layout.
 */
export function useChatContextSafe(): ChatContextValue | null {
  return useContext(ChatContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const enabled = FEATURE_FLAGS.AI_COMPANION && !!spaceId;

  // Panel open/close
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  }, []);

  const handleNewAssistantMessage = useCallback(() => {
    if (!isOpen) {
      setHasUnread(true);
    }
  }, [isOpen]);

  // Core chat hook — only active when we have a spaceId
  const chat = useChat(spaceId ?? 'none');

  // AI features
  const { suggestions, dismiss: dismissSuggestion } = useAISuggestions(
    enabled ? spaceId : undefined
  );
  const { briefing, dismiss: dismissBriefing } = useAIBriefing(
    enabled ? spaceId : undefined
  );

  const value: ChatContextValue = {
    enabled,
    spaceId,

    // Panel
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    hasUnread,

    // Chat
    messages: chat.messages,
    conversationId: chat.conversationId,
    isLoading: chat.isLoading,
    isStreaming: chat.isStreaming,
    pendingAction: chat.pendingAction,
    error: chat.error,
    sendMessage: chat.sendMessage,
    confirmAction: chat.confirmAction,
    clearChat: chat.clearChat,
    stopStreaming: chat.stopStreaming,
    clearError: chat.clearError,

    // Suggestions
    suggestions,
    dismissSuggestion,

    // Briefing
    briefing,
    dismissBriefing,

    // Unread
    handleNewAssistantMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
