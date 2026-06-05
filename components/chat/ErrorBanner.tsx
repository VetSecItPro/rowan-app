/**
 * ErrorBanner — Dismissible error bar with optional Retry button
 *
 * Slides in above the chat input when an error occurs.
 * "Retry" re-sends the last user message.
 */

'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Wand2 } from 'lucide-react';
import Link from 'next/link';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
  /** Phase 10.7: when set, the error is a free-teaser subscribe-nudge - render
   *  an amber "Upgrade" CTA instead of a plain red error. */
  upgradeUrl?: string;
}

/** Renders an error banner; on the free-AI-teaser cap it becomes an upgrade nudge. */
export default function ErrorBanner({
  message,
  onDismiss,
  onRetry,
  upgradeUrl,
}: ErrorBannerProps) {
  const isNudge = Boolean(upgradeUrl);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={
        isNudge
          ? 'px-4 py-2 bg-amber-500/10 border-t border-amber-500/25'
          : 'px-4 py-2 bg-red-500/10 border-t border-red-500/20'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isNudge ? (
            <Wand2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          )}
          <p className={`text-xs ${isNudge ? 'text-amber-200' : 'text-red-300 truncate'}`}>{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isNudge && upgradeUrl && (
            <Link
              href={upgradeUrl}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-colors whitespace-nowrap"
            >
              Upgrade
            </Link>
          )}
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
            className={`text-xs transition-colors ${isNudge ? 'text-amber-400/80 hover:text-amber-300' : 'text-red-400 hover:text-red-300'}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}
