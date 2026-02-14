/**
 * useCanAccessAI — Client-side AI access check
 *
 * Lightweight hook that checks if the current user's subscription tier
 * allows AI features. Uses the existing subscription context (no extra API call).
 *
 * Returns { canAccess, tier, isLoading, promptUpgrade }.
 */

'use client';

import { useFeatureGateSafe } from '@/lib/hooks/useFeatureGate';
import { FEATURE_FLAGS } from '@/lib/constants/feature-flags';
import type { SubscriptionTier } from '@/lib/types';

export interface AIAccessState {
  /** Whether the user can access AI features (tier + feature flag) */
  canAccess: boolean;
  /** The user's current subscription tier */
  tier: SubscriptionTier;
  /** Whether subscription data is still loading */
  isLoading: boolean;
  /** Show upgrade modal prompting user to upgrade */
  promptUpgrade: () => void;
}

/** Checks whether the current user's tier grants access to AI features */
export function useCanAccessAI(): AIAccessState {
  const gate = useFeatureGateSafe('ai');

  // If subscription context isn't available yet, deny access safely
  if (!gate) {
    return {
      canAccess: false,
      tier: 'free',
      isLoading: true,
      promptUpgrade: () => {},
    };
  }

  return {
    canAccess: FEATURE_FLAGS.AI_COMPANION && gate.hasAccess,
    tier: gate.tier,
    isLoading: gate.isLoading,
    promptUpgrade: gate.promptUpgrade,
  };
}
