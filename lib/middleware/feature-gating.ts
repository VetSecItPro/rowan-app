/**
 * Feature Gating Middleware
 * Provides HOCs for API routes to enforce subscription tier and usage limits
 *
 * IMPORTANT: Server-side only - use in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../supabase/server';
import { canAccessFeature, canPerformUsageAction } from '../services/feature-access-service';
import type { SubscriptionTier, UsageType } from '../types';

/**
 * API Route Handler type
 */
type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Higher-order function to check subscription tier before allowing access
 *
 * @param handler - The API route handler to wrap
 * @param requiredTier - Minimum tier required ('pro' or 'family')
 * @param feature - Feature name for upgrade messaging
 * @returns Wrapped handler with tier check
 *
 * @example
 * ```typescript
 * export const POST = withSubscriptionCheck(
 *   async (request) => {
 *     // Your handler logic
 *   },
 *   'pro',
 *   'calendar'
 * );
 * ```
 */
export function withSubscriptionCheck(
  handler: RouteHandler,
  requiredTier: SubscriptionTier,
  feature: string
): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check subscription tier access
      const featureKey = getFeatureKey(feature);
      if (featureKey) {
        const accessCheck = await canAccessFeature(user.id, featureKey);

        if (!accessCheck.allowed) {
          return NextResponse.json(
            {
              error: 'Feature not available',
              reason: accessCheck.reason,
              requiredTier,
              currentTier: accessCheck.tier,
              feature,
              upgradeRequired: true,
            },
            { status: 403 }
          );
        }
      }

      // Tier check passed, call original handler
      return handler(request, context);
    } catch (error) {
      console.error('Error in subscription check middleware:', error);
      return NextResponse.json(
        { error: 'Failed to check subscription' },
        { status: 500 }
      );
    }
  };
}

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
  return async (request: NextRequest, context?: any) => {
    try {
      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user can perform action
      const accessCheck = await canPerformUsageAction(user.id, usageType);

      if (!accessCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Usage limit reached',
            reason: accessCheck.reason,
            currentUsage: accessCheck.currentUsage,
            limit: accessCheck.limit,
            currentTier: accessCheck.tier,
            usageType,
            upgradeRequired: true,
          },
          { status: 429 } // 429 Too Many Requests
        );
      }

      // Usage check passed, call original handler
      const response = await handler(request, context);

      // If handler succeeded and auto-increment is enabled, increment usage
      // Only increment on successful responses (2xx status codes)
      if (autoIncrement && response.status >= 200 && response.status < 300) {
        // Import incrementUsage here to avoid circular dependency
        const { incrementUsage } = await import('../services/usage-service');
        const incrementResult = await incrementUsage(user.id, usageType);
        if (!incrementResult.success) {
          console.error('Failed to increment usage:', incrementResult.error);
          // Don't fail the request, just log the error
        }
      }

      return response;
    } catch (error) {
      console.error('Error in usage check middleware:', error);
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      );
    }
  };
}

/**
 * Combine subscription and usage checks
 *
 * @param handler - The API route handler to wrap
 * @param requiredTier - Minimum tier required
 * @param feature - Feature name for messaging
 * @param usageType - Type of usage to track
 * @param autoIncrement - Whether to auto-increment usage
 * @returns Wrapped handler with both checks
 *
 * @example
 * ```typescript
 * export const POST = withFeatureGating(
 *   async (request) => {
 *     // Your handler logic
 *   },
 *   'pro',
 *   'calendar',
 *   'tasks_created',
 *   true
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
 * Helper function to map feature names to feature access keys
 */
function getFeatureKey(
  feature: string
): 'canUploadPhotos' | 'canUseMealPlanning' | 'canUseReminders' | 'canUseGoals' | 'canUseHousehold' | 'canUseAI' | 'canUseIntegrations' | null {
  const featureMap: Record<string, any> = {
    photos: 'canUploadPhotos',
    mealPlanning: 'canUseMealPlanning',
    meals: 'canUseMealPlanning',
    reminders: 'canUseReminders',
    goals: 'canUseGoals',
    household: 'canUseHousehold',
    ai: 'canUseAI',
    integrations: 'canUseIntegrations',
  };

  return featureMap[feature] || null;
}
