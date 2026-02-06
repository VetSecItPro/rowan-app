/**
 * ChatPanel — Main chat interface panel
 *
 * Slide-in panel from the right side with:
 * - Auto-scrolling message list
 * - Streaming text display
 * - Confirmation flow for tool calls
 * - New conversation button
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Bot } from 'lucide-react';
import { useChat } from '@/lib/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  spaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ spaceId, isOpen, onClose }: ChatPanelProps) {
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

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConfirm = (actionId: string, confirmed: boolean) => {
    confirmAction(actionId, confirmed);
  };

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
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">
                    Hey! I&apos;m Rowan
                  </h3>
                  <p className="text-xs text-gray-400 max-w-[280px]">
                    I can help you create tasks, plan meals, schedule events,
                    and manage your household. Just ask!
                  </p>
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
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-red-500/10 border-t border-red-500/20"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-red-300">{error}</p>
                    <button
                      onClick={clearError}
                      className="text-xs text-red-400 hover:text-red-300 ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
