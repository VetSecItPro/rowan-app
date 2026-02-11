/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for the Rowan app.
 * Use environment variables to control feature rollouts.
 *
 * SAFETY: All features default to disabled (false) for safety.
 * Enable features by setting environment variables in .env.local
 */

// Feature flag interface for type safety
interface FeatureFlags {
  PERSONAL_WORKSPACES: boolean;
  SMART_ONBOARDING: boolean;
  WORKSPACE_MIGRATION: boolean;
  MONETIZATION: boolean;
  AI_COMPANION: boolean;
}

/**
 * Feature flag configuration
 * CRITICAL: All flags default to false for safety
 */
export const FEATURE_FLAGS: FeatureFlags = {
  /**
   * Personal Workspaces Feature
   * Allows single users to use app without creating/joining spaces
   *
   * Enable with: NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES=true
   */
  PERSONAL_WORKSPACES: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES === 'true',

  /**
   * Smart Onboarding Feature
   * Intent-based onboarding (personal vs family use)
   *
   * Enable with: NEXT_PUBLIC_ENABLE_SMART_ONBOARDING=true
   */
  SMART_ONBOARDING: process.env.NEXT_PUBLIC_ENABLE_SMART_ONBOARDING === 'true',

  /**
   * Workspace Migration Feature
   * Migrate data from personal to shared workspaces
   *
   * Enable with: NEXT_PUBLIC_ENABLE_WORKSPACE_MIGRATION=true
   */
  WORKSPACE_MIGRATION: process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_MIGRATION === 'true',

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
   * Check if personal workspaces are enabled
   */
  isPersonalWorkspacesEnabled(): boolean {
    return FEATURE_FLAGS.PERSONAL_WORKSPACES;
  },

  /**
   * Check if smart onboarding is enabled
   */
  isSmartOnboardingEnabled(): boolean {
    return FEATURE_FLAGS.SMART_ONBOARDING;
  },

  /**
   * Check if workspace migration is enabled
   */
  isWorkspaceMigrationEnabled(): boolean {
    return FEATURE_FLAGS.WORKSPACE_MIGRATION;
  },

  /**
   * Check if monetization features are enabled
   * Controls pricing page, upgrade prompts, and subscription management
   */
  isMonetizationEnabled(): boolean {
    return FEATURE_FLAGS.MONETIZATION;
  },

  /**
   * Get all feature flags status (for debugging)
   */
  getAllFlags(): FeatureFlags {
    return { ...FEATURE_FLAGS };
  },

  /**
   * Check if any personal workspace features are enabled
   * Useful for conditional UI rendering
   */
  /**
   * Check if AI companion features are enabled
   */
  isAICompanionEnabled(): boolean {
    return FEATURE_FLAGS.AI_COMPANION;
  },

  isPersonalWorkspaceSuiteEnabled(): boolean {
    return (
      FEATURE_FLAGS.PERSONAL_WORKSPACES ||
      FEATURE_FLAGS.SMART_ONBOARDING ||
      FEATURE_FLAGS.WORKSPACE_MIGRATION
    );
  }
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
      // eslint-disable-next-line no-console -- intentional debug logging
      console.log('🚩 Feature Flags Status:', FEATURE_FLAGS);
    }
  },

  /**
   * Get environment variable status for debugging
   */
  getEnvStatus(): Record<string, string | undefined> {
    return {
      NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES: process.env.NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES,
      NEXT_PUBLIC_ENABLE_SMART_ONBOARDING: process.env.NEXT_PUBLIC_ENABLE_SMART_ONBOARDING,
      NEXT_PUBLIC_ENABLE_WORKSPACE_MIGRATION: process.env.NEXT_PUBLIC_ENABLE_WORKSPACE_MIGRATION,
      NEXT_PUBLIC_ENABLE_MONETIZATION: process.env.NEXT_PUBLIC_ENABLE_MONETIZATION,
      NEXT_PUBLIC_ENABLE_AI_COMPANION: process.env.NEXT_PUBLIC_ENABLE_AI_COMPANION,
    };
  }
};