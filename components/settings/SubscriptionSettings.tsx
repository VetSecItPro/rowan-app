'use client';

/**
 * Subscription Settings Tab
 * Displays subscription status, trial info, and upgrade options
 */

import React from 'react';
import Link from 'next/link';
import { Crown, Clock, Check, Sparkles, Zap, Shield, AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/lib/contexts/subscription-context';
import { motion } from 'framer-motion';

const TIER_DETAILS = {
  free: {
    name: 'Free',
    color: 'gray',
    features: [
      'Up to 10 tasks',
      'Up to 5 calendar events',
      'Basic reminders',
      '2 users, 1 space',
    ],
  },
  pro: {
    name: 'Pro',
    color: 'emerald',
    features: [
      'Unlimited tasks & calendar',
      'Photo upload (5GB)',
      'Meal planning & recipes',
      'Goals & milestones',
      'Household management',
      '2 users, 1 space',
    ],
  },
  family: {
    name: 'Family',
    color: 'purple',
    features: [
      'Everything in Pro',
      'AI-powered features',
      'External integrations',
      '6 users, 3 spaces',
      '15GB storage',
      'Priority support',
    ],
  },
};

export function SubscriptionSettings() {
  const {
    tier,
    effectiveTier,
    isLoading,
    isInTrial,
    trialDaysRemaining,
    hasTrialExpired,
    trialEndsAt,
    limits,
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const currentTierDetails = TIER_DETAILS[effectiveTier];

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className={`h-5 w-5 ${
                effectiveTier === 'family' ? 'text-purple-500' :
                effectiveTier === 'pro' ? 'text-emerald-500' : 'text-gray-500'
              }`} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {currentTierDetails.name} Plan
              </h3>
              {isInTrial && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <Clock className="h-3 w-3" />
                  Trial
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isInTrial
                ? `You're enjoying Pro features during your trial`
                : tier === 'free'
                  ? 'Upgrade to unlock more features'
                  : 'Thank you for being a subscriber'
              }
            </p>
          </div>

          {tier !== 'family' && (
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Link>
          )}
        </div>

        {/* Trial Status */}
        {isInTrial && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-amber-800 dark:text-amber-200">
                {trialDaysRemaining} days remaining in your trial
              </span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your trial {trialEndsAt ? `ends on ${new Date(trialEndsAt).toLocaleDateString()}` : 'is active'}.
              Upgrade before it ends to keep all Pro features.
            </p>
            <div className="mt-2 h-2 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, (trialDaysRemaining / 14) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hasTrialExpired && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-800 dark:text-red-200">
                Your trial has ended
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              You've been moved to the Free plan. Upgrade to regain access to Pro features.
            </p>
          </div>
        )}

        {/* Current Plan Features */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Your current features:
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentTierDetails.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Check className={`h-4 w-4 flex-shrink-0 ${
                  effectiveTier === 'family' ? 'text-purple-500' :
                  effectiveTier === 'pro' ? 'text-emerald-500' : 'text-gray-400'
                }`} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Usage Limits */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Feature Limits
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {limits.maxTasks === Infinity ? '∞' : limits.maxTasks}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {limits.maxEvents === Infinity ? '∞' : limits.maxEvents}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Events</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {limits.maxSpaces}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Spaces</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {limits.maxUsersPerSpace}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Users/Space</p>
          </div>
        </div>
      </motion.div>

      {/* Billing & Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Billing & Management
        </h3>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-gray-900 dark:text-white">View Plans & Pricing</span>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          {(tier === 'pro' || tier === 'family') && (
            <button
              className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => {
                // TODO: Implement Stripe customer portal
                console.log('Open billing portal');
              }}
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">Manage Billing</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Secure payments processed by Stripe. Your payment information is never stored on our servers.
        </p>
      </motion.div>
    </div>
  );
}
