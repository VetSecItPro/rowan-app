/**
 * Feature Gating Middleware
 * Combines subscription and usage checks for comprehensive feature gating
 *
 * IMPORTANT: Server-side only - use in API routes
 */

import { withSubscriptionCheck, type RouteHandler } from './subscription-check';
import { withUsageCheck } from './usage-check';
import type { SubscriptionTier, UsageType } from '../types';

/**
 * Combine subscription and usage checks into a single middleware
 *
 * This is useful when a feature:
 * 1. Requires a specific subscription tier (e.g., 'pro' or 'family')
 * 2. Has daily usage limits that should be tracked
 *
 * @param handler - The API route handler to wrap
 * @param requiredTier - Minimum tier required
 * @param feature - Feature name for messaging
 * @param usageType - Type of usage to track (optional)
 * @param autoIncrement - Whether to auto-increment usage (default: true)
 * @returns Wrapped handler with both checks
 *
 * @example
 * ```typescript
 * // Tier + usage check for AI features
 * export const POST = withFeatureGating(
 *   async (request) => {
 *     // AI feature logic
 *     return NextResponse.json({ success: true });
 *   },
 *   'family',      // Requires Family tier
 *   'ai',          // AI feature
 *   'quick_actions_used',  // Track as quick action
 *   true           // Auto-increment on success
 * );
 *
 * // Tier-only check (no usage tracking)
 * export const GET = withFeatureGating(
 *   async (request) => {
 *     // Read-only feature
 *     return NextResponse.json({ data: [] });
 *   },
 *   'pro',
 *   'mealPlanning'
 * );
 * ```
 */
export function withFeatureGating(
  handler: RouteHandler,
  requiredTier: SubscriptionTier,
  feature: string,
  usageType?: UsageType,
  autoIncrement: boolean = true
): RouteHandler {
  // Apply subscription check first
  let wrappedHandler = withSubscriptionCheck(handler, requiredTier, feature);

  // Then apply usage check if usage type provided
  if (usageType) {
    wrappedHandler = withUsageCheck(wrappedHandler, usageType, autoIncrement);
  }

  return wrappedHandler;
}

/**
 * Pre-configured middleware for common feature patterns
 */

/**
 * Wrap handler for Pro-tier features
 */
export function withProTierCheck(
  handler: RouteHandler,
  feature: string,
  usageType?: UsageType
): RouteHandler {
  return withFeatureGating(handler, 'pro', feature, usageType);
}

/**
 * Wrap handler for Family-tier features
 */
export function withFamilyTierCheck(
  handler: RouteHandler,
  feature: string,
  usageType?: UsageType
): RouteHandler {
  return withFeatureGating(handler, 'family', feature, usageType);
}

/**
 * Wrap handler for AI features (Family tier + quick actions usage)
 */
export function withAIFeatureCheck(handler: RouteHandler): RouteHandler {
  return withFeatureGating(handler, 'family', 'ai', 'quick_actions_used', true);
}

/**
 * Wrap handler for task creation (tracks usage, all tiers allowed)
 */
export function withTaskCreationCheck(handler: RouteHandler): RouteHandler {
  return withUsageCheck(handler, 'tasks_created', true);
}

/**
 * Wrap handler for message sending (tracks usage, all tiers allowed)
 */
export function withMessageCheck(handler: RouteHandler): RouteHandler {
  return withUsageCheck(handler, 'messages_sent', true);
}

/**
 * Wrap handler for shopping list updates (tracks usage, all tiers allowed)
 */
export function withShoppingCheck(handler: RouteHandler): RouteHandler {
  return withUsageCheck(handler, 'shopping_list_updates', true);
}
