'use client';

/**
 * Upgrade Modal
 * Modal prompting users to upgrade their subscription
 */

import React from 'react';
import Link from 'next/link';
import { Crown, Check, Sparkles, Zap, Lock } from 'lucide-react';
import { useSubscriptionSafe } from '@/lib/contexts/subscription-context';
import { Modal } from '@/components/ui/Modal';

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
];

/** Renders a modal showcasing premium features and upgrade options. */
export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  title: customTitle,
  description: customDescription,
}: UpgradeModalProps) {
  const subscription = useSubscriptionSafe();

  const featureInfo = feature ? FEATURE_MESSAGES[feature] : null;
  const title = customTitle || featureInfo?.title || 'Upgrade to Pro';
  const description = customDescription || featureInfo?.description || 'Unlock all features for your family.';

  // Determine which tier is needed for this feature
  const requiresFamily = feature === 'ai' || feature === 'integrations';

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
      >
        Maybe Later
      </button>
      <Link
        href="/pricing"
        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full hover:from-emerald-700 hover:to-teal-700 transition-colors font-medium"
        onClick={onClose}
      >
        <Crown className="h-4 w-4" />
        <span>View Plans</span>
      </Link>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={description}
      maxWidth="lg"
      headerGradient="bg-gradient-to-r from-emerald-500 to-teal-500"
      footer={footerContent}
      testId="upgrade-modal"
    >
      <div className="space-y-6">
        {/* Feature Icon */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            {featureInfo?.icon || <Crown className="h-8 w-8" />}
          </div>

        </div>

        {/* Features list */}
        <div className="space-y-4">
          <h3 className="font-semibold text-white">
            {requiresFamily ? 'Family Plan includes:' : 'Pro Plan includes:'}
          </h3>

          <ul className="space-y-2">
            {(requiresFamily ? [...PRO_FEATURES, ...FAMILY_EXTRAS] : PRO_FEATURES).map((feat, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing hint */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            {requiresFamily
              ? 'Starting at $18/month'
              : 'Starting at $12/month'}
          </p>
        </div>
      </div>
    </Modal>
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
  const featureKey = feature as keyof typeof FEATURE_MESSAGES;

  // Check if feature is accessible (default to true if no provider)
  const hasAccess = canAccess(featureKey as Parameters<typeof canAccess>[0]);

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
            Upgrade to Unlock
          </span>
        </div>
      </div>
    </div>
  );
}
