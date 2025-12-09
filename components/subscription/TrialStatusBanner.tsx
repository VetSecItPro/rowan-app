'use client';

/**
 * Trial Status Banner
 * Displays trial status on dashboard with countdown and upgrade CTA
 */

import React from 'react';
import Link from 'next/link';
import { Clock, Sparkles, AlertTriangle, X, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/lib/contexts/subscription-context';
import { motion, AnimatePresence } from 'framer-motion';

interface TrialStatusBannerProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
  compact?: boolean;
}

export function TrialStatusBanner({
  onDismiss,
  showDismiss = false,
  compact = false,
}: TrialStatusBannerProps) {
  const {
    isLoading,
    isInTrial,
    trialDaysRemaining,
    isTrialExpiringSoon,
    hasTrialExpired,
    tier,
    effectiveTier,
  } = useSubscription();

  // Don't show if loading or user has paid subscription
  if (isLoading || tier === 'pro' || tier === 'family') {
    return null;
  }

  // User is in active trial
  if (isInTrial) {
    const urgencyLevel = trialDaysRemaining <= 1 ? 'critical' : trialDaysRemaining <= 3 ? 'warning' : 'info';

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`relative rounded-xl overflow-hidden ${
            urgencyLevel === 'critical'
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : urgencyLevel === 'warning'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          } ${compact ? 'p-3' : 'p-4'}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {urgencyLevel === 'critical' ? (
                <div className="flex-shrink-0 rounded-full bg-white/20 p-2">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              ) : urgencyLevel === 'warning' ? (
                <div className="flex-shrink-0 rounded-full bg-white/20 p-2">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              ) : (
                <div className="flex-shrink-0 rounded-full bg-white/20 p-2">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              )}

              <div className={compact ? '' : 'space-y-0.5'}>
                <p className="font-semibold text-white">
                  {urgencyLevel === 'critical'
                    ? `Trial ends ${trialDaysRemaining === 0 ? 'today' : 'tomorrow'}!`
                    : urgencyLevel === 'warning'
                      ? `${trialDaysRemaining} days left in your trial`
                      : `Enjoying your free trial (${trialDaysRemaining} days left)`}
                </p>
                {!compact && (
                  <p className="text-sm text-white/80">
                    {urgencyLevel === 'critical' || urgencyLevel === 'warning'
                      ? 'Upgrade now to keep all your Pro features'
                      : 'You have full access to Pro features'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className={`flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 font-medium text-gray-900 shadow-sm transition-all hover:bg-gray-100 ${
                  compact ? 'text-sm' : ''
                }`}
              >
                <Crown className="h-4 w-4" />
                <span>Upgrade</span>
              </Link>

              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar showing trial time remaining */}
          {!compact && (
            <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-white/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, (trialDaysRemaining / 14) * 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Trial has expired - show upgrade prompt
  if (hasTrialExpired) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`relative rounded-xl overflow-hidden bg-gradient-to-r from-gray-700 to-gray-800 ${
            compact ? 'p-3' : 'p-4'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 rounded-full bg-white/10 p-2">
                <Zap className="h-5 w-5 text-amber-400" />
              </div>

              <div className={compact ? '' : 'space-y-0.5'}>
                <p className="font-semibold text-white">Your trial has ended</p>
                {!compact && (
                  <p className="text-sm text-gray-300">
                    Upgrade to unlock all the features you've been using
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-600 ${
                  compact ? 'text-sm' : ''
                }`}
              >
                <Crown className="h-4 w-4" />
                <span>Upgrade Now</span>
              </Link>

              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Free tier user who never had a trial (shouldn't happen with new model, but fallback)
  return null;
}

/**
 * Compact trial badge for navigation/sidebar
 */
export function TrialBadge() {
  const { isInTrial, trialDaysRemaining, hasTrialExpired, tier, isLoading } = useSubscription();

  if (isLoading || tier === 'pro' || tier === 'family') {
    return null;
  }

  if (isInTrial) {
    const isUrgent = trialDaysRemaining <= 3;
    return (
      <Link
        href="/pricing"
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
          isUrgent
            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
        }`}
      >
        <Clock className="h-3 w-3" />
        <span>{trialDaysRemaining}d left</span>
      </Link>
    );
  }

  if (hasTrialExpired) {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        <Crown className="h-3 w-3" />
        <span>Upgrade</span>
      </Link>
    );
  }

  return null;
}
