/**
 * Usage Check Middleware
 * HOC for API routes to enforce daily usage limits
 *
 * IMPORTANT: Server-side only - use in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../supabase/server';
import { canPerformUsageAction } from '../services/feature-access-service';
import { incrementUsage, getTodayUsage } from '../services/usage-service';
import { getUserTier } from '../services/subscription-service';
import { getFeatureLimits } from '../config/feature-limits';
import type { UsageType } from '../types';
import { logger } from '@/lib/logger';

/**
 * API Route Handler type
 */
export type RouteHandler = (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>;

/**
 * Usage type friendly names for error messages
 */
const USAGE_TYPE_NAMES: Record<UsageType, string> = {
  tasks_created: 'task creation',
  messages_sent: 'messages',
  quick_actions_used: 'quick actions',
  shopping_list_updates: 'shopping list updates',
};

/**
 * Higher-order function to check usage limits before allowing action
 *
 * @param handler - The API route handler to wrap
 * @param usageType - Type of usage to track
 * @param autoIncrement - Whether to automatically increment usage counter on success
 * @returns Wrapped handler with usage check
 *
 * @example
 * ```typescript
 * export const POST = withUsageCheck(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   'tasks_created',
 *   true // Auto-increment after successful task creation
 * );
 * ```
 */
export function withUsageCheck(
  handler: RouteHandler,
  usageType: UsageType,
  autoIncrement: boolean = true
): RouteHandler {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      // Get authenticated user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please log in to continue' },
          { status: 401 }
        );
      }

      // Check if user can perform action
      const accessCheck = await canPerformUsageAction(user.id, usageType);

      if (!accessCheck.allowed) {
        const usageName = USAGE_TYPE_NAMES[usageType] || usageType;
        return NextResponse.json(
          {
            error: 'Usage limit reached',
            message: `You've reached your daily ${usageName} limit (${accessCheck.currentUsage}/${accessCheck.limit}). Upgrade to continue.`,
            reason: accessCheck.reason,
            currentUsage: accessCheck.currentUsage,
            limit: accessCheck.limit,
            currentTier: accessCheck.tier,
            usageType,
            upgradeRequired: true,
            upgradeUrl: '/pricing',
            resetsAt: getNextResetTime(),
          },
          { status: 429 } // 429 Too Many Requests
        );
      }

      // Usage check passed, call original handler
      const response = await handler(request, context);

      // If handler succeeded and auto-increment is enabled, increment usage
      // Only increment on successful responses (2xx status codes)
      if (autoIncrement && response.status >= 200 && response.status < 300) {
        const incrementResult = await incrementUsage(user.id, usageType);
        if (!incrementResult.success) {
          logger.error('Failed to increment usage:', undefined, { component: 'lib-usage-check', action: 'service_call', details: incrementResult.error });
          // Don't fail the request, just log the error
        }
      }

      return response;
    } catch (error) {
      logger.error('Error in usage check middleware:', error, { component: 'lib-usage-check', action: 'service_call' });
      return NextResponse.json(
        { error: 'Internal error', message: 'Failed to check usage limits' },
        { status: 500 }
      );
    }
  };
}

/**
 * Get next usage reset time (midnight UTC)
 */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Check usage limits without wrapping handler
 * Useful for inline checks within route handlers
 *
 * @param userId - The user ID to check
 * @param usageType - Type of usage to check
 * @returns Object with usage status and details
 */
export async function checkUsageLimit(
  userId: string,
  usageType: UsageType
): Promise<{
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  message?: string;
}> {
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
  const limit = limits[limitKey] as number;

  // Unlimited access
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage,
      limit: -1,
      remaining: -1,
    };
  }

  const remaining = Math.max(0, limit - currentUsage);
  const allowed = currentUsage < limit;

  return {
    allowed,
    currentUsage,
    limit,
    remaining,
    message: allowed
      ? undefined
      : `Daily limit reached (${currentUsage}/${limit})`,
  };
}

/**
 * Manually increment usage counter
 * Use when you need more control over when to increment
 *
 * @param userId - The user ID
 * @param usageType - Type of usage to increment
 * @param amount - Amount to increment (default: 1)
 */
export async function trackUsage(
  userId: string,
  usageType: UsageType,
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  return incrementUsage(userId, usageType, amount);
}
