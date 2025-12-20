'use client';

/**
 * Feature Gating Hook
 * Provides feature access checking with upgrade prompts
 */

import { useCallback, useMemo, useState, useContext } from 'react';
import { useSubscriptionSafe } from '@/lib/contexts/subscription-context';
import type { FeatureLimits, SubscriptionTier } from '@/lib/types';

export type GatedFeature =
  | 'mealPlanning'
  | 'goals'
  | 'household'
  | 'photos'
  | 'ai'
  | 'integrations'
  | 'calendar'
  | 'reminders'
  | 'unlimitedTasks'
  | 'unlimitedMessages'
  | 'unlimitedShopping';

// Map features to their required feature limit keys
const FEATURE_LIMIT_MAP: Record<GatedFeature, keyof FeatureLimits> = {
  mealPlanning: 'canUseMealPlanning',
  goals: 'canUseGoals',
  household: 'canUseHousehold',
  photos: 'canUploadPhotos',
  ai: 'canUseAI',
  integrations: 'canUseIntegrations',
  calendar: 'canCreateCalendar',
  reminders: 'canUseReminders',
  unlimitedTasks: 'maxActiveTasks',
  unlimitedMessages: 'dailyMessages',
  unlimitedShopping: 'maxShoppingLists',
};

// Map features to their required minimum tier
const FEATURE_TIER_MAP: Record<GatedFeature, SubscriptionTier> = {
  mealPlanning: 'pro',
  goals: 'pro',
  household: 'pro',
  photos: 'pro',
  ai: 'family',
  integrations: 'family',
  calendar: 'pro',
  reminders: 'free', // Available to all
  unlimitedTasks: 'pro',
  unlimitedMessages: 'pro',
  unlimitedShopping: 'pro',
};

// Human-readable feature names
const FEATURE_NAMES: Record<GatedFeature, string> = {
  mealPlanning: 'Meal Planning',
  goals: 'Goals & Milestones',
  household: 'Household Management',
  photos: 'Photo Uploads',
  ai: 'AI Features',
  integrations: 'External Integrations',
  calendar: 'Calendar',
  reminders: 'Reminders',
  unlimitedTasks: 'Unlimited Tasks',
  unlimitedMessages: 'Unlimited Messages',
  unlimitedShopping: 'Unlimited Shopping Lists',
};

interface UseFeatureGateResult {
  /** Whether the user has access to this feature */
  hasAccess: boolean;
  /** Whether the subscription data is still loading */
  isLoading: boolean;
  /** The user's current effective tier (considers trial) */
  tier: SubscriptionTier;
  /** Whether the user is in a trial period */
  isInTrial: boolean;
  /** Days remaining in trial (0 if not in trial) */
  trialDaysRemaining: number;
  /** The minimum tier required for this feature */
  requiredTier: SubscriptionTier;
  /** Human-readable feature name */
  featureName: string;
  /** Function to show upgrade modal */
  promptUpgrade: () => void;
  /** Check access and prompt upgrade if needed - returns true if has access */
  checkAndPrompt: () => boolean;
}

/**
 * Hook for gating features based on subscription tier
 *
 * @example
 * ```tsx
 * function MealsPage() {
 *   const { hasAccess, isLoading, promptUpgrade, checkAndPrompt } = useFeatureGate('mealPlanning');
 *
 *   if (isLoading) return <Loading />;
 *   if (!hasAccess) {
 *     return <UpgradePrompt feature="mealPlanning" />;
 *   }
 *
 *   // Or use checkAndPrompt for action buttons:
 *   const handleAddMeal = () => {
 *     if (!checkAndPrompt()) return;
 *     // ... add meal logic
 *   };
 * }
 * ```
 */
export function useFeatureGate(feature: GatedFeature): UseFeatureGateResult {
  // Use safe version that returns null if provider not available
  const subscription = useSubscriptionSafe();

  // Default values when provider isn't available (during loading/auth)
  const canAccess = subscription?.canAccess ?? (() => true);
  const effectiveTier = subscription?.effectiveTier ?? 'free';
  const isLoading = subscription?.isLoading ?? true;
  const isInTrial = subscription?.isInTrial ?? false;
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? 0;
  const showUpgradeModal = subscription?.showUpgradeModal ?? (() => {});

  const limitKey = FEATURE_LIMIT_MAP[feature];
  const hasAccess = canAccess(limitKey);
  const requiredTier = FEATURE_TIER_MAP[feature];
  const featureName = FEATURE_NAMES[feature];

  const promptUpgrade = useCallback(() => {
    showUpgradeModal(feature);
  }, [showUpgradeModal, feature]);

  const checkAndPrompt = useCallback((): boolean => {
    if (!hasAccess) {
      showUpgradeModal(feature);
      return false;
    }
    return true;
  }, [hasAccess, showUpgradeModal, feature]);

  return {
    hasAccess,
    isLoading,
    tier: effectiveTier,
    isInTrial,
    trialDaysRemaining,
    requiredTier,
    featureName,
    promptUpgrade,
    checkAndPrompt,
  };
}

/**
 * Safe version that returns null outside of SubscriptionProvider
 */
export function useFeatureGateSafe(feature: GatedFeature): UseFeatureGateResult | null {
  const subscription = useSubscriptionSafe();

  if (!subscription) {
    return null;
  }

  const {
    canAccess,
    effectiveTier,
    isLoading,
    isInTrial,
    trialDaysRemaining,
    showUpgradeModal
  } = subscription;

  const limitKey = FEATURE_LIMIT_MAP[feature];
  const hasAccess = canAccess(limitKey);
  const requiredTier = FEATURE_TIER_MAP[feature];
  const featureName = FEATURE_NAMES[feature];

  return {
    hasAccess,
    isLoading,
    tier: effectiveTier,
    isInTrial,
    trialDaysRemaining,
    requiredTier,
    featureName,
    promptUpgrade: () => showUpgradeModal(feature),
    checkAndPrompt: () => {
      if (!hasAccess) {
        showUpgradeModal(feature);
        return false;
      }
      return true;
    },
  };
}

/**
 * Hook for checking multiple features at once
 */
export function useMultiFeatureGate(features: GatedFeature[]): {
  allAccessible: boolean;
  accessMap: Record<GatedFeature, boolean>;
  isLoading: boolean;
  tier: SubscriptionTier;
} {
  const subscription = useSubscriptionSafe();
  const canAccess = subscription?.canAccess ?? (() => true);
  const effectiveTier = subscription?.effectiveTier ?? 'free';
  const isLoading = subscription?.isLoading ?? true;

  const accessMap = useMemo(() => {
    const map: Partial<Record<GatedFeature, boolean>> = {};
    for (const feature of features) {
      const limitKey = FEATURE_LIMIT_MAP[feature];
      map[feature] = canAccess(limitKey);
    }
    return map as Record<GatedFeature, boolean>;
  }, [features, canAccess]);

  const allAccessible = useMemo(() => {
    return features.every(f => accessMap[f]);
  }, [features, accessMap]);

  return {
    allAccessible,
    accessMap,
    isLoading,
    tier: effectiveTier,
  };
}

/**
 * Hook for numeric limit checking (tasks, shopping lists, etc.)
 */
export function useNumericLimit(
  limitKey: 'maxActiveTasks' | 'maxShoppingLists' | 'maxShoppingItems' | 'maxUsers' | 'maxSpaces'
): {
  limit: number;
  isUnlimited: boolean;
  isLoading: boolean;
  tier: SubscriptionTier;
  checkWithinLimit: (currentCount: number) => boolean;
  promptIfExceeded: (currentCount: number) => boolean;
} {
  const subscription = useSubscriptionSafe();
  const limits = subscription?.limits ?? { maxActiveTasks: Infinity, maxShoppingLists: Infinity, maxShoppingItems: Infinity, maxUsers: Infinity, maxSpaces: Infinity };
  const effectiveTier = subscription?.effectiveTier ?? 'free';
  const isLoading = subscription?.isLoading ?? true;
  const showUpgradeModal = subscription?.showUpgradeModal ?? (() => {});

  const limit = limits[limitKey] as number;
  const isUnlimited = limit === Infinity;

  const checkWithinLimit = useCallback((currentCount: number): boolean => {
    if (isUnlimited) return true;
    return currentCount < limit;
  }, [limit, isUnlimited]);

  const promptIfExceeded = useCallback((currentCount: number): boolean => {
    if (checkWithinLimit(currentCount)) return true;

    // Map limit key to feature name for upgrade modal
    const featureMap: Record<string, string> = {
      maxActiveTasks: 'tasks',
      maxShoppingLists: 'shopping',
      maxShoppingItems: 'shopping',
      maxUsers: 'users',
      maxSpaces: 'spaces',
    };
    showUpgradeModal(featureMap[limitKey] || limitKey);
    return false;
  }, [checkWithinLimit, showUpgradeModal, limitKey]);

  return {
    limit,
    isUnlimited,
    isLoading,
    tier: effectiveTier,
    checkWithinLimit,
    promptIfExceeded,
  };
}
