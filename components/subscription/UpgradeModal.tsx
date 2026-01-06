'use client';

/**
 * Upgrade Modal
 * Trial-aware modal prompting users to upgrade
 */

import React from 'react';
import Link from 'next/link';
import { X, Crown, Check, Clock, Sparkles, Zap, Lock } from 'lucide-react';
import { useSubscriptionSafe } from '@/lib/contexts/subscription-context';
import { motion, AnimatePresence } from 'framer-motion';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  title?: string;
  description?: string;
}

// Feature-specific messaging
const FEATURE_MESSAGES: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  photos: {
    title: 'Photo Uploads',
    description: 'Upload and share family photos with your household.',
    icon: <Lock className="h-6 w-6" />,
  },
  mealPlanning: {
    title: 'Meal Planning',
    description: 'Plan meals, save recipes, and generate shopping lists automatically.',
    icon: <Lock className="h-6 w-6" />,
  },
  meals: {
    title: 'Meal Planning',
    description: 'Plan meals, save recipes, and generate shopping lists automatically.',
    icon: <Lock className="h-6 w-6" />,
  },
  goals: {
    title: 'Goals & Milestones',
    description: 'Set family goals and track progress together.',
    icon: <Lock className="h-6 w-6" />,
  },
  household: {
    title: 'Household Management',
    description: 'Manage chores, expenses, and household tasks.',
    icon: <Lock className="h-6 w-6" />,
  },
  ai: {
    title: 'AI Features',
    description: 'Smart suggestions, natural language input, and AI-powered insights.',
    icon: <Sparkles className="h-6 w-6" />,
  },
  integrations: {
    title: 'External Integrations',
    description: 'Connect with Google Calendar, Apple Calendar, and more.',
    icon: <Zap className="h-6 w-6" />,
  },
  calendar: {
    title: 'Calendar Access',
    description: 'Create and manage calendar events for your family.',
    icon: <Lock className="h-6 w-6" />,
  },
  spaces: {
    title: 'More Spaces',
    description: 'Create additional spaces for work, extended family, or different projects.',
    icon: <Lock className="h-6 w-6" />,
  },
  maxSpaces: {
    title: 'More Spaces',
    description: 'Create additional spaces for work, extended family, or different projects.',
    icon: <Lock className="h-6 w-6" />,
  },
};

const PRO_FEATURES = [
  'Unlimited tasks & calendar events',
  'Photo uploads (2GB storage)',
  'Meal planning & recipes',
  'Goals & milestones',
  'Household management',
  'Real-time collaboration',
  'Unlimited messages',
  '2 spaces',
];

const FAMILY_EXTRAS = [
  'AI-powered features',
  'External integrations',
  '3 spaces (vs 2)',
  'Up to 6 family members',
  '5GB storage',
  'Priority support',
];

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  title: customTitle,
  description: customDescription,
}: UpgradeModalProps) {
  const subscription = useSubscriptionSafe();
  const isInTrial = subscription?.isInTrial ?? false;
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;
  const hasTrialExpired = subscription?.hasTrialExpired ?? false;
  const effectiveTier = subscription?.effectiveTier ?? 'free';

  const featureInfo = feature ? FEATURE_MESSAGES[feature] : null;
  const title = customTitle || featureInfo?.title || 'Upgrade to Pro';
  const description = customDescription || featureInfo?.description || 'Unlock all features for your family.';

  // Determine which tier is needed for this feature
  const requiresFamily = feature === 'ai' || feature === 'integrations';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                {featureInfo?.icon || <Crown className="h-8 w-8" />}
              </div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="mt-2 text-white/80">{description}</p>

              {/* Trial status badge */}
              {isInTrial && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{trialDaysRemaining} days left in trial</span>
                </div>
              )}

              {hasTrialExpired && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Your trial has ended</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* Trial message */}
              {isInTrial && (
                <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>You're on a free trial!</strong> You currently have access to this feature.
                    Upgrade before your trial ends to keep using it.
                  </p>
                </div>
              )}

              {/* Features list */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {requiresFamily ? 'Family Plan includes:' : 'Pro Plan includes:'}
                </h3>

                <ul className="space-y-2">
                  {(requiresFamily ? [...PRO_FEATURES, ...FAMILY_EXTRAS] : PRO_FEATURES).map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing hint */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {requiresFamily
                    ? 'Starting at $17.99/month'
                    : 'Starting at $11.99/month'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Maybe Later
              </button>
              <Link
                href="/pricing"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:from-emerald-700 hover:to-teal-700 transition-colors"
                onClick={onClose}
              >
                <Crown className="h-4 w-4" />
                <span>View Plans</span>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Simple feature lock overlay for locked features
 */
export function FeatureLockOverlay({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  const subscription = useSubscriptionSafe();
  const canAccess = subscription?.canAccess ?? (() => true);
  const showUpgradeModal = subscription?.showUpgradeModal ?? (() => {});
  const isInTrial = subscription?.isInTrial ?? false;
  const featureKey = feature as keyof typeof FEATURE_MESSAGES;

  // Check if feature is accessible (default to true if no provider)
  const hasAccess = canAccess(featureKey as any);

  if (hasAccess || !subscription) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50">{children}</div>
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={() => showUpgradeModal(feature)}
      >
        <div className="flex items-center gap-2 rounded-lg bg-gray-900/80 px-4 py-2 text-white shadow-lg">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isInTrial ? 'Unlock Feature' : 'Upgrade to Unlock'}
          </span>
        </div>
      </div>
    </div>
  );
}
