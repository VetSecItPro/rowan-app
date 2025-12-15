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
import { logger } from '@/lib/logger';

/**
 * Get today's usage for a user and usage type
 *
 * Note: The database schema has individual columns for each usage type
 * (tasks_created, messages_sent, etc.) rather than a generic usage_type column.
 */
export async function getTodayUsage(
  userId: string,
  usageType: UsageType
): Promise<number> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Map UsageType to the actual database column name
  const columnMap: Record<UsageType, string> = {
    tasks_created: 'tasks_created',
    messages_sent: 'messages_sent',
    shopping_list_updates: 'shopping_list_updates',
    quick_actions_used: 'quick_actions_used',
  };

  const columnName = columnMap[usageType];

  const { data, error } = await supabase
    .from('daily_usage')
    .select(columnName)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error) {
    // If no record exists, usage is 0
    return 0;
  }

  return (data as Record<string, number>)?.[columnName] || 0;
}

/**
 * Increment usage counter for a specific type
 *
 * Uses upsert to atomically increment the counter for today.
 * The database schema has individual columns for each usage type.
 */
export async function incrementUsage(
  userId: string,
  usageType: UsageType,
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Map UsageType to the actual database column name
  const columnMap: Record<UsageType, string> = {
    tasks_created: 'tasks_created',
    messages_sent: 'messages_sent',
    shopping_list_updates: 'shopping_list_updates',
    quick_actions_used: 'quick_actions_used',
  };

  const columnName = columnMap[usageType];

  // First, try to get existing record
  const { data: existing } = await supabase
    .from('daily_usage')
    .select('id, ' + columnName)
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    // Update existing record
    const currentValue = (existing as Record<string, number>)[columnName] || 0;
    const { error } = await supabase
      .from('daily_usage')
      .update({ [columnName]: currentValue + amount })
      .eq('id', existing.id);

    if (error) {
      logger.error('Error incrementing usage:', error, { component: 'lib-usage-service', action: 'service_call' });
      return { success: false, error: error.message };
    }
  } else {
    // Insert new record with default values
    const { error } = await supabase
      .from('daily_usage')
      .insert({
        user_id: userId,
        date: today,
        tasks_created: usageType === 'tasks_created' ? amount : 0,
        messages_sent: usageType === 'messages_sent' ? amount : 0,
        shopping_list_updates: usageType === 'shopping_list_updates' ? amount : 0,
        quick_actions_used: usageType === 'quick_actions_used' ? amount : 0,
      });

    if (error) {
      logger.error('Error creating usage record:', error, { component: 'lib-usage-service', action: 'service_call' });
      return { success: false, error: error.message };
    }
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
    logger.error('Error resetting daily usage:', error, { component: 'lib-usage-service', action: 'service_call' });
    return { success: false, error: error.message };
  }

  return { success: true };
}
