/**
 * Feature Access Service
 * Combines subscription tier and usage tracking to determine feature access
 *
 * IMPORTANT: Server-side only - central authority for feature access
 */

import { getUserTier } from './subscription-service';
import { createClient } from '../supabase/server';
import { getFeatureLimits } from '../config/feature-limits';
import { canPerformAction, getTodayUsage } from './usage-service';
import type { SubscriptionTier, UsageType } from '../types';

/**
 * Check if user can access a boolean feature (tier-based)
 *
 * BULLETPROOF: If tier resolution fails (DB error), this throws rather than
 * returning { allowed: false } — so the API route returns 500 instead of 403.
 * A paying user should never see "upgrade to unlock" because of infra issues.
 *
 * @param userId - The user ID to check
 * @param feature - The feature to check access for
 * @param supabaseClient - Optional pre-authenticated Supabase client
 */
export async function canAccessFeature(
  userId: string,
  feature: 'canUploadPhotos' | 'canUseMealPlanning' | 'canUseReminders' | 'canUseGoals' | 'canUseHousehold' | 'canUseAI' | 'canUseIntegrations' | 'canUseEventProposals',
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<{ allowed: boolean; reason?: string; tier?: SubscriptionTier }> {
  // getUserTier throws on DB error — let it propagate
  const tier = await getUserTier(userId, supabaseClient);
  const limits = getFeatureLimits(tier);
  const allowed = limits[feature] === true;

  if (!allowed) {
    const familyOnlyFeatures = ['canUseIntegrations'];
    const requiredTier = familyOnlyFeatures.includes(feature) ? 'Family' : 'Pro';
    return {
      allowed: false,
      reason: `This feature requires ${requiredTier} tier`,
      tier,
    };
  }

  return { allowed: true, tier };
}

/**
 * Check if user can perform a usage-limited action
 */
export async function canPerformUsageAction(
  userId: string,
  usageType: UsageType
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number; tier?: SubscriptionTier }> {
  const tier = await getUserTier(userId);
  const result = await canPerformAction(userId, usageType);

  return {
    ...result,
    tier,
  };
}

/**
 * Check if user can access a numeric-limited feature
 */
export async function canUseNumericFeature(
  userId: string,
  feature: 'maxActiveTasks' | 'maxShoppingLists' | 'maxShoppingItems' | 'maxUsers' | 'maxSpaces',
  currentCount: number
): Promise<{ allowed: boolean; reason?: string; limit?: number; tier?: SubscriptionTier }> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);
  const limit = limits[feature];

  // Should always be a number
  if (typeof limit !== 'number') {
    return { allowed: true, tier };
  }

  // Unlimited access
  if (limit === -1) {
    return { allowed: true, limit, tier };
  }

  // Check if limit exceeded
  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: `Limit reached (${currentCount}/${limit}). Upgrade to ${tier === 'free' ? 'Pro' : 'Family'} tier for ${tier === 'free' ? 'unlimited' : 'more'} access.`,
      limit,
      tier,
    };
  }

  return { allowed: true, limit, tier };
}

/**
 * Get comprehensive feature access summary for a user
 */
export async function getUserFeatureAccess(userId: string): Promise<{
  tier: SubscriptionTier;
  features: {
    uploadPhotos: boolean;
    mealPlanning: boolean;
    reminders: boolean;
    goals: boolean;
    household: boolean;
    ai: boolean;
    integrations: boolean;
    eventProposals: boolean;
  };
  limits: {
    activeTasks: number;
    shoppingLists: number;
    shoppingItems: number;
    users: number;
    spaces: number;
    storageGB: number | undefined;
  };
  dailyUsage: {
    taskCreation: { current: number; limit: number; remaining: number };
    messages: { current: number; limit: number; remaining: number };
    shoppingUpdates: { current: number; limit: number; remaining: number };
    quickActions: { current: number; limit: number; remaining: number };
  };
}> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);

  // Get today's usage
  const [taskCreationUsage, messagesUsage, shoppingUsage, quickActionsUsage] = await Promise.all([
    getTodayUsage(userId, 'tasks_created'),
    getTodayUsage(userId, 'messages_sent'),
    getTodayUsage(userId, 'shopping_list_updates'),
    getTodayUsage(userId, 'quick_actions_used'),
  ]);

  const calculateRemaining = (usage: number, limit: number): number => {
    if (limit === -1) return -1; // unlimited
    return Math.max(0, limit - usage);
  };

  return {
    tier,
    features: {
      uploadPhotos: limits.canUploadPhotos,
      mealPlanning: limits.canUseMealPlanning,
      reminders: limits.canUseReminders,
      goals: limits.canUseGoals,
      household: limits.canUseHousehold,
      ai: limits.canUseAI,
      integrations: limits.canUseIntegrations,
      eventProposals: limits.canUseEventProposals,
    },
    limits: {
      activeTasks: limits.maxActiveTasks,
      shoppingLists: limits.maxShoppingLists,
      shoppingItems: limits.maxShoppingItems,
      users: limits.maxUsers,
      spaces: limits.maxSpaces,
      storageGB: limits.storageGB,
    },
    dailyUsage: {
      taskCreation: {
        current: taskCreationUsage,
        limit: limits.dailyTaskCreation,
        remaining: calculateRemaining(taskCreationUsage, limits.dailyTaskCreation),
      },
      messages: {
        current: messagesUsage,
        limit: limits.dailyMessages,
        remaining: calculateRemaining(messagesUsage, limits.dailyMessages),
      },
      shoppingUpdates: {
        current: shoppingUsage,
        limit: limits.dailyShoppingUpdates,
        remaining: calculateRemaining(shoppingUsage, limits.dailyShoppingUpdates),
      },
      quickActions: {
        current: quickActionsUsage,
        limit: limits.dailyQuickActions,
        remaining: calculateRemaining(quickActionsUsage, limits.dailyQuickActions),
      },
    },
  };
}

/**
 * Check if user needs to upgrade for a specific feature
 */
export async function shouldPromptUpgrade(
  userId: string,
  feature: string
): Promise<{ shouldPrompt: boolean; currentTier: SubscriptionTier; requiredTier?: SubscriptionTier; reason?: string }> {
  const tier = await getUserTier(userId);

  // Map features to required tiers
  const featureRequirements: Record<string, SubscriptionTier> = {
    uploadPhotos: 'pro',
    mealPlanning: 'pro',
    goals: 'pro',
    household: 'pro',
    eventProposals: 'pro',
    ai: 'pro',
    integrations: 'family',
  };

  const requiredTier = featureRequirements[feature];

  if (!requiredTier) {
    return { shouldPrompt: false, currentTier: tier };
  }

  // Tier hierarchy check
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    family: 2,
  };

  const hasAccess = tierHierarchy[tier] >= tierHierarchy[requiredTier];

  if (hasAccess) {
    return { shouldPrompt: false, currentTier: tier };
  }

  return {
    shouldPrompt: true,
    currentTier: tier,
    requiredTier,
    reason: `Upgrade to ${requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} to unlock this feature`,
  };
}

/**
 * Check if user is approaching any limits (for warnings)
 */
export async function getLimitWarnings(
  userId: string,
  warningThreshold: number = 0.8 // 80% of limit
): Promise<{
  hasWarnings: boolean;
  warnings: Array<{
    type: 'usage' | 'feature';
    feature: string;
    current: number;
    limit: number;
    percentage: number;
    message: string;
  }>;
}> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);
  const warnings: Array<{
    type: 'usage' | 'feature';
    feature: string;
    current: number;
    limit: number;
    percentage: number;
    message: string;
  }> = [];

  // Check daily usage limits
  const [taskCreation, messages, shopping, quickActions] = await Promise.all([
    getTodayUsage(userId, 'tasks_created'),
    getTodayUsage(userId, 'messages_sent'),
    getTodayUsage(userId, 'shopping_list_updates'),
    getTodayUsage(userId, 'quick_actions_used'),
  ]);

  const usageChecks = [
    { feature: 'Task Creation', current: taskCreation, limit: limits.dailyTaskCreation },
    { feature: 'Messages', current: messages, limit: limits.dailyMessages },
    { feature: 'Shopping Updates', current: shopping, limit: limits.dailyShoppingUpdates },
    { feature: 'Quick Actions', current: quickActions, limit: limits.dailyQuickActions },
  ];

  for (const check of usageChecks) {
    if (check.limit !== -1 && check.current / check.limit >= warningThreshold) {
      const percentage = Math.round((check.current / check.limit) * 100);
      warnings.push({
        type: 'usage',
        feature: check.feature,
        current: check.current,
        limit: check.limit,
        percentage,
        message: `You've used ${check.current} of ${check.limit} ${check.feature.toLowerCase()} today (${percentage}%)`,
      });
    }
  }

  return {
    hasWarnings: warnings.length > 0,
    warnings,
  };
}
