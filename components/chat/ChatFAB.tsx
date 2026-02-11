/**
 * ChatFAB — Floating Action Button to open the Chat Panel
 *
 * Fixed in the bottom-right corner. Self-sources the current spaceId
 * from auth context so it can be dropped anywhere in the layout.
 * Shows a red unread badge when new assistant messages arrive while
 * the panel is closed.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import ChatPanel from './ChatPanel';

export default function ChatFAB() {
  const { currentSpace } = useAuthWithSpaces();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleNewAssistantMessage = useCallback(() => {
    if (!isOpen) {
      setHasUnread(true);
    }
  }, [isOpen]);

  // Don't render if AI companion is disabled or no space is selected
  if (!FEATURE_FLAGS.AI_COMPANION || !currentSpace?.id) return null;

  return (
    <>
      {/* FAB button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 flex items-center justify-center transition-colors"
            aria-label="Open AI chat assistant"
          >
            <MessageCircle className="w-6 h-6 text-white" />

            {/* Unread badge */}
            {hasUnread && (
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
        spaceId={currentSpace.id}
        isOpen={isOpen}
        onClose={handleClose}
        onNewAssistantMessage={handleNewAssistantMessage}
      />
    </>
  );
}
