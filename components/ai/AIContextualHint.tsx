'use client';

/**
 * AIContextualHint — Small inline component suggesting users try AI
 *
 * Placed inside empty states or low-content areas to nudge users
 * toward the AI chat. Only shows when AI is enabled and the user
 * hasn't dismissed it (localStorage-based per feature key).
 */

import { useState } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import { useChatContextSafe } from '@/lib/contexts/chat-context';

interface AIContextualHintProps {
  /** Unique key for persistence (e.g., 'tasks', 'calendar') */
  featureKey: string;
  /** Example prompt to show the user */
  prompt: string;
  /** Optional short label (defaults to "Try Rowan AI") */
  label?: string;
}

const STORAGE_PREFIX = 'rowan_ai_hint_dismissed_';

/** Check localStorage dismissal status (safe for SSR) */
function isDismissedForKey(featureKey: string): boolean {
  if (typeof window === 'undefined') return true; // Default hidden during SSR
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${featureKey}`) === 'true';
  } catch {
    return true;
  }
}

/** Displays a contextual AI suggestion hint based on the current feature area. */
export function AIContextualHint({
  featureKey,
  prompt,
  label = 'Try Rowan AI',
}: AIContextualHintProps) {
  const chatCtx = useChatContextSafe();
  // Lazy initializer reads localStorage once — no effect needed
  const [dismissed, setDismissed] = useState(() => isDismissedForKey(featureKey));
  // Client-side component: safe to assume mounted after hydration
  const [mounted] = useState(() => typeof window !== 'undefined');

  if (!mounted || !FEATURE_FLAGS.AI_COMPANION || !chatCtx?.enabled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`${STORAGE_PREFIX}${featureKey}`, 'true');
  };

  const handleTryIt = () => {
    chatCtx.openChat();
    // Pre-fill the prompt — the user still has to send it
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-4 mx-auto max-w-sm"
        >
          <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
              aria-label="Dismiss AI hint"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs font-medium text-blue-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>

            {/* Try button */}
            <button
              onClick={handleTryIt}
              className="flex-shrink-0 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ask
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
