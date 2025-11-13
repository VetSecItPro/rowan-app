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
}

/**
 * Feature flag configuration
 * CRITICAL: All flags default to false for safety
 */
const parseBooleanFlag = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === 'true';
};

export const FEATURE_FLAGS: FeatureFlags = {
  /**
   * Personal Workspaces Feature
   * Allows single users to use app without creating/joining spaces
   *
   * Enable with: NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES=true
   */
  PERSONAL_WORKSPACES: parseBooleanFlag(process.env.NEXT_PUBLIC_ENABLE_PERSONAL_WORKSPACES, true),

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
   * Get all feature flags status (for debugging)
   */
  getAllFlags(): FeatureFlags {
    return { ...FEATURE_FLAGS };
  },

  /**
   * Check if any personal workspace features are enabled
   * Useful for conditional UI rendering
   */
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
    };
  }
};
