/**
 * Usage Tracking Service
 * Tracks feature usage for free tier limits
 *
 * IMPORTANT: Server-side only - ensures accurate usage tracking
 */

import { createClient } from '../supabase/server';
import { getUserTier } from './subscription-service';
import { getFeatureLimits, isUnlimited, hasReachedLimit } from '../config/feature-limits';
import type { UsageType } from '../types';

/**
 * Get today's usage for a user and usage type
 */
export async function getTodayUsage(
  userId: string,
  usageType: UsageType
): Promise<number> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('daily_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_type', usageType)
    .eq('date', today)
    .single();

  if (error) {
    // If no record exists, usage is 0
    return 0;
  }

  return data?.count || 0;
}

/**
 * Increment usage counter for a specific type
 */
export async function incrementUsage(
  userId: string,
  usageType: UsageType,
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Use the database function to increment atomically
  const { error } = await supabase.rpc('increment_daily_usage', {
    p_user_id: userId,
    p_usage_type: usageType,
    p_increment: amount,
  });

  if (error) {
    console.error('Error incrementing usage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if user has exceeded their limit for a usage type
 */
export async function hasExceededLimit(
  userId: string,
  usageType: UsageType
): Promise<boolean> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);
  const currentUsage = await getTodayUsage(userId, usageType);

  // Map usage types to limit keys
  const limitMap: Record<UsageType, keyof typeof limits> = {
    tasks_created: 'dailyTaskCreation',
    messages_sent: 'dailyMessages',
    shopping_list_updates: 'dailyShoppingUpdates',
    quick_actions_used: 'dailyQuickActions',
  };

  const limitKey = limitMap[usageType];
  const limit = limits[limitKey];

  // Should always be a number, but TypeScript needs the check
  if (typeof limit !== 'number') {
    return false;
  }

  return hasReachedLimit(currentUsage, limit);
}

/**
 * Check if user can perform an action (usage + limits check)
 */
export async function canPerformAction(
  userId: string,
  usageType: UsageType
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);
  const currentUsage = await getTodayUsage(userId, usageType);

  // Map usage types to limit keys
  const limitMap: Record<UsageType, keyof typeof limits> = {
    tasks_created: 'dailyTaskCreation',
    messages_sent: 'dailyMessages',
    shopping_list_updates: 'dailyShoppingUpdates',
    quick_actions_used: 'dailyQuickActions',
  };

  const limitKey = limitMap[usageType];
  const limit = limits[limitKey];

  // Should always be a number
  if (typeof limit !== 'number') {
    return { allowed: true };
  }

  // Unlimited access
  if (isUnlimited(limit)) {
    return { allowed: true, currentUsage, limit };
  }

  // Check if limit exceeded
  if (hasReachedLimit(currentUsage, limit)) {
    return {
      allowed: false,
      reason: `Daily limit reached (${currentUsage}/${limit})`,
      currentUsage,
      limit,
    };
  }

  return { allowed: true, currentUsage, limit };
}

/**
 * Get all usage stats for today
 */
export async function getTodayUsageStats(userId: string): Promise<{
  taskCreation: number;
  messagesSent: number;
  shoppingUpdates: number;
  quickActions: number;
}> {
  const [taskCreation, messagesSent, shoppingUpdates, quickActions] = await Promise.all([
    getTodayUsage(userId, 'tasks_created'),
    getTodayUsage(userId, 'messages_sent'),
    getTodayUsage(userId, 'shopping_list_updates'),
    getTodayUsage(userId, 'quick_actions_used'),
  ]);

  return {
    taskCreation,
    messagesSent,
    shoppingUpdates,
    quickActions,
  };
}

/**
 * Get usage with limits for display
 */
export async function getUsageWithLimits(userId: string): Promise<{
  tier: string;
  usage: {
    taskCreation: { current: number; limit: number; percentage: number };
    messagesSent: { current: number; limit: number; percentage: number };
    shoppingUpdates: { current: number; limit: number; percentage: number };
    quickActions: { current: number; limit: number; percentage: number };
  };
}> {
  const tier = await getUserTier(userId);
  const limits = getFeatureLimits(tier);
  const stats = await getTodayUsageStats(userId);

  const calculatePercentage = (current: number, limit: number): number => {
    if (isUnlimited(limit)) return 0;
    return Math.min(Math.round((current / limit) * 100), 100);
  };

  return {
    tier,
    usage: {
      taskCreation: {
        current: stats.taskCreation,
        limit: limits.dailyTaskCreation,
        percentage: calculatePercentage(stats.taskCreation, limits.dailyTaskCreation),
      },
      messagesSent: {
        current: stats.messagesSent,
        limit: limits.dailyMessages,
        percentage: calculatePercentage(stats.messagesSent, limits.dailyMessages),
      },
      shoppingUpdates: {
        current: stats.shoppingUpdates,
        limit: limits.dailyShoppingUpdates,
        percentage: calculatePercentage(stats.shoppingUpdates, limits.dailyShoppingUpdates),
      },
      quickActions: {
        current: stats.quickActions,
        limit: limits.dailyQuickActions,
        percentage: calculatePercentage(stats.quickActions, limits.dailyQuickActions),
      },
    },
  };
}

/**
 * Reset usage counters (typically run via cron job at midnight)
 */
export async function resetDailyUsage(): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Delete old records (older than today)
  const { error } = await supabase
    .from('daily_usage')
    .delete()
    .lt('date', today);

  if (error) {
    console.error('Error resetting daily usage:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
