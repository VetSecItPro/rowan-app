/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for the Rowan app.
 * Use environment variables to control feature rollouts.
 *
 * SAFETY: All features default to disabled (false) for safety.
 * Enable features by setting environment variables in .env.local
 */

import { logger } from '../logger';

// Feature flag interface for type safety
interface FeatureFlags {
  MONETIZATION: boolean;
  AI_COMPANION: boolean;
}

/**
 * Feature flag configuration
 * CRITICAL: All flags default to false for safety
 */
export const FEATURE_FLAGS: FeatureFlags = {
  /**
   * Monetization Feature
   * Enables pricing page, upgrade prompts, and subscription management
   * Controls visibility of all paid features for gradual rollout
   *
   * Enable with: NEXT_PUBLIC_ENABLE_MONETIZATION=true
   */
  MONETIZATION: process.env.NEXT_PUBLIC_ENABLE_MONETIZATION === 'true',

  /**
   * AI Companion Feature
   * Enables the AI chat assistant (ChatFAB, conversation persistence, voice)
   *
   * Enable with: NEXT_PUBLIC_ENABLE_AI_COMPANION=true
   */
  AI_COMPANION: process.env.NEXT_PUBLIC_ENABLE_AI_COMPANION === 'true',
};

/**
 * Helper functions for feature flag checks
 */
export const featureFlags = {
  /**
   * Check if monetization features are enabled
   * Controls pricing page, upgrade prompts, and subscription management
   */
  isMonetizationEnabled(): boolean {
    return FEATURE_FLAGS.MONETIZATION;
  },

  /**
   * Check if AI companion features are enabled
   */
  isAICompanionEnabled(): boolean {
    return FEATURE_FLAGS.AI_COMPANION;
  },

  /**
   * Get all feature flags status (for debugging)
   */
  getAllFlags(): FeatureFlags {
    return { ...FEATURE_FLAGS };
  },
};

/**
 * Development helpers
 */
export const featureFlagHelpers = {
  /**
   * Log all feature flag states (development only)
   */
  logFeatureFlags(): void {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Feature Flags Status', { flags: FEATURE_FLAGS });
    }
  },

  /**
   * Get environment variable status for debugging
   */
  getEnvStatus(): Record<string, string | undefined> {
    return {
      NEXT_PUBLIC_ENABLE_MONETIZATION: process.env.NEXT_PUBLIC_ENABLE_MONETIZATION,
      NEXT_PUBLIC_ENABLE_AI_COMPANION: process.env.NEXT_PUBLIC_ENABLE_AI_COMPANION,
    };
  },
};
