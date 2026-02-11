/**
 * ChatFAB — Floating Action Button to open the Chat Panel
 *
 * Desktop only (hidden on mobile where BottomNav takes over).
 * Consumes ChatContext for shared open/close and unread state.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import ChatPanel from './ChatPanel';

export default function ChatFAB() {
  const ctx = useChatContextSafe();

  // Don't render if no context, AI disabled, or user lacks AI access (tier check)
  if (!ctx?.enabled || !ctx.spaceId) return null;

  return (
    <>
      {/* FAB button — desktop only (BottomNav replaces on mobile) */}
      <AnimatePresence>
        {!ctx.isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={ctx.openChat}
            className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 items-center justify-center transition-colors"
            aria-label="Open AI chat assistant"
          >
            <MessageCircle className="w-6 h-6 text-white" />

            {/* Unread badge */}
            {ctx.hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full border-2 border-gray-900 flex items-center justify-center"
              >
                <span className="w-2 h-2 bg-white rounded-full" />
              </motion.span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <ChatPanel
        spaceId={ctx.spaceId}
        isOpen={ctx.isOpen}
        onClose={ctx.closeChat}
        onNewAssistantMessage={ctx.handleNewAssistantMessage}
        voiceEnabled={ctx.voiceEnabled}
      />
    </>
  );
}
