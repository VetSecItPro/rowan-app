/**
 * Feature Limits Configuration
 * Defines what each subscription tier can access
 *
 * IMPORTANT: This is the single source of truth for all tier limits
 */

import type { SubscriptionTier, FeatureLimits } from '../types';

/**
 * Feature limits for each subscription tier
 */
export const FEATURE_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    // Task limits
    maxActiveTasks: 50,
    dailyTaskCreation: 10,

    // Calendar
    canCreateCalendar: true,

    // Shopping lists
    maxShoppingLists: 3,
    maxShoppingItems: 50,
    dailyShoppingUpdates: 20,

    // Messages
    messageHistoryDays: 30,
    dailyMessages: 50,

    // Quick actions
    dailyQuickActions: 20,

    // Feature access
    canUploadPhotos: false,
    canUseMealPlanning: false,
    canUseReminders: true,
    canUseGoals: false,
    canUseHousehold: false,
    canUseAI: false,
    canUseIntegrations: false,
    canUseEventProposals: false,

    // Performance
    realtimeSyncDelay: 0, // milliseconds

    // Users and spaces
    maxUsers: 2,
    maxSpaces: 1,

    // Storage
    storageGB: 0.5,

    // Support
    prioritySupport: false,
  },

  pro: {
    // Task limits
    maxActiveTasks: -1, // unlimited
    dailyTaskCreation: -1, // unlimited

    // Calendar
    canCreateCalendar: true,

    // Shopping lists
    maxShoppingLists: -1, // unlimited
    maxShoppingItems: -1, // unlimited
    dailyShoppingUpdates: -1, // unlimited

    // Messages
    messageHistoryDays: -1, // unlimited
    dailyMessages: -1, // unlimited

    // Quick actions
    dailyQuickActions: -1, // unlimited

    // Feature access
    canUploadPhotos: true,
    canUseMealPlanning: true,
    canUseReminders: true,
    canUseGoals: true,
    canUseHousehold: true,
    canUseAI: false, // Family tier only
    canUseIntegrations: false, // Family tier only
    canUseEventProposals: true, // Pro tier and above

    // Performance
    realtimeSyncDelay: 0,

    // Users and spaces
    maxUsers: 2,
    maxSpaces: 1,

    // Storage
    storageGB: 2,

    // Support
    prioritySupport: false,
  },

  family: {
    // Task limits
    maxActiveTasks: -1, // unlimited
    dailyTaskCreation: -1, // unlimited

    // Calendar
    canCreateCalendar: true,

    // Shopping lists
    maxShoppingLists: -1, // unlimited
    maxShoppingItems: -1, // unlimited
    dailyShoppingUpdates: -1, // unlimited

    // Messages
    messageHistoryDays: -1, // unlimited
    dailyMessages: -1, // unlimited

    // Quick actions
    dailyQuickActions: -1, // unlimited

    // Feature access
    canUploadPhotos: true,
    canUseMealPlanning: true,
    canUseReminders: true,
    canUseGoals: true,
    canUseHousehold: true,
    canUseAI: true,
    canUseIntegrations: true,
    canUseEventProposals: true,

    // Performance
    realtimeSyncDelay: 0,

    // Users and spaces
    maxUsers: 6,
    maxSpaces: 1,

    // Storage
    storageGB: 5,

    // Support
    prioritySupport: true,
  },
};

/**
 * Get feature limits for a specific tier
 */
export function getFeatureLimits(tier: SubscriptionTier): FeatureLimits {
  return FEATURE_LIMITS[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof FeatureLimits
): boolean {
  const limits = FEATURE_LIMITS[tier];
  const value = limits[feature];

  // Boolean features
  if (typeof value === 'boolean') {
    return value;
  }

  // Numeric features (-1 means unlimited, 0 means no access)
  if (typeof value === 'number') {
    return value !== 0;
  }

  return false;
}

/**
 * Get limit value for a specific feature
 */
export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: keyof FeatureLimits
): number | boolean | undefined {
  return FEATURE_LIMITS[tier][feature];
}

/**
 * Check if limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if user has reached a numeric limit
 */
export function hasReachedLimit(currentUsage: number, limit: number): boolean {
  if (isUnlimited(limit)) {
    return false;
  }
  return currentUsage >= limit;
}

/**
 * Get user-friendly limit description
 */
export function getLimitDescription(limit: number): string {
  if (isUnlimited(limit)) {
    return 'Unlimited';
  }
  return limit.toString();
}

/**
 * Feature names for display
 */
export const FEATURE_NAMES: Record<string, string> = {
  maxActiveTasks: 'Active Tasks',
  dailyTaskCreation: 'Daily Task Creation',
  canCreateCalendar: 'Calendar Access',
  maxShoppingLists: 'Shopping Lists',
  maxShoppingItems: 'Shopping Items',
  dailyShoppingUpdates: 'Daily Shopping Updates',
  messageHistoryDays: 'Message History',
  dailyMessages: 'Daily Messages',
  dailyQuickActions: 'Daily Quick Actions',
  canUploadPhotos: 'Photo Upload',
  canUseMealPlanning: 'Meal Planning',
  canUseReminders: 'Reminders',
  canUseGoals: 'Goals & Milestones',
  canUseHousehold: 'Household Management',
  canUseAI: 'AI Features',
  canUseIntegrations: 'External Integrations',
  canUseEventProposals: 'Event Proposals & Find Time',
  maxUsers: 'Maximum Users',
  maxSpaces: 'Maximum Spaces',
  storageGB: 'Storage (GB)',
  prioritySupport: 'Priority Support',
};

/**
 * Get feature name for display
 */
export function getFeatureName(feature: string): string {
  return FEATURE_NAMES[feature] || feature;
}
