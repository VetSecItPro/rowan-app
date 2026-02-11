/**
 * ErrorBanner — Dismissible error bar with optional Retry button
 *
 * Slides in above the chat input when an error occurs.
 * "Retry" re-sends the last user message.
 */

'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: ErrorBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-2 bg-red-500/10 border-t border-red-500/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300 truncate">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-medium text-red-300 hover:text-red-200 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
