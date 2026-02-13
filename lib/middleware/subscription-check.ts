/**
 * Subscription Check Middleware
 * HOC for API routes to enforce subscription tier requirements
 *
 * IMPORTANT: Server-side only - use in API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../supabase/server';
import { canAccessFeature } from '../services/feature-access-service';
import { hasTierAccess, getUserTier } from '../services/subscription-service';
import type { SubscriptionTier } from '../types';
import { logger } from '@/lib/logger';

/**
 * API Route Handler type
 */
export type RouteHandler = (request: NextRequest, context?: Record<string, unknown>) => Promise<NextResponse>;

/**
 * Feature access check keys
 */
export type FeatureAccessKey =
  | 'canUploadPhotos'
  | 'canUseMealPlanning'
  | 'canUseReminders'
  | 'canUseGoals'
  | 'canUseHousehold'
  | 'canUseAI'
  | 'canUseIntegrations';

/**
 * Map feature names to feature access keys
 */
const FEATURE_MAP: Record<string, FeatureAccessKey> = {
  photos: 'canUploadPhotos',
  mealPlanning: 'canUseMealPlanning',
  meals: 'canUseMealPlanning',
  reminders: 'canUseReminders',
  goals: 'canUseGoals',
  household: 'canUseHousehold',
  ai: 'canUseAI',
  integrations: 'canUseIntegrations',
};

/**
 * Get feature access key from feature name
 */
export function getFeatureKey(feature: string): FeatureAccessKey | null {
  return FEATURE_MAP[feature] || null;
}

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
 *     return NextResponse.json({ success: true });
 *   },
 *   'pro',
 *   'mealPlanning'
 * );
 * ```
 */
export function withSubscriptionCheck(
  handler: RouteHandler,
  requiredTier: SubscriptionTier,
  feature: string
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
          { error: 'Unauthorized', message: 'Please log in to access this feature' },
          { status: 401 }
        );
      }

      // Check subscription tier access
      const featureKey = getFeatureKey(feature);
      if (featureKey) {
        const accessCheck = await canAccessFeature(user.id, featureKey, supabase);

        if (!accessCheck.allowed) {
          return NextResponse.json(
            {
              error: 'Feature not available',
              message: accessCheck.reason || `This feature requires a ${requiredTier} subscription`,
              requiredTier,
              currentTier: accessCheck.tier,
              feature,
              upgradeRequired: true,
              upgradeUrl: '/pricing',
            },
            { status: 403 }
          );
        }
      } else {
        // If no feature key, check tier directly
        const hasAccess = await hasTierAccess(user.id, requiredTier);
        if (!hasAccess) {
          const currentTier = await getUserTier(user.id);
          return NextResponse.json(
            {
              error: 'Tier access denied',
              message: `This feature requires a ${requiredTier} subscription`,
              requiredTier,
              currentTier,
              feature,
              upgradeRequired: true,
              upgradeUrl: '/pricing',
            },
            { status: 403 }
          );
        }
      }

      // Tier check passed, call original handler
      return handler(request, context);
    } catch (error) {
      logger.error('Error in subscription check middleware:', error, { component: 'lib-subscription-check', action: 'service_call' });
      return NextResponse.json(
        { error: 'Internal error', message: 'Failed to check subscription status' },
        { status: 500 }
      );
    }
  };
}

/**
 * Feature-specific upgrade nudge messages.
 * Keys match the `feature` prop on UpgradeModal so the client
 * can trigger the modal directly from the API response.
 */
const UPGRADE_NUDGES: Record<string, { feature: string; requiredTier: SubscriptionTier; message: string }> = {
  canUseMealPlanning: {
    feature: 'meals',
    requiredTier: 'pro',
    message: 'Unlock meal planning, recipes, and auto-generated shopping lists with Pro.',
  },
  canUseGoals: {
    feature: 'goals',
    requiredTier: 'pro',
    message: 'Set family goals and track milestones together with Pro.',
  },
  canUseHousehold: {
    feature: 'household',
    requiredTier: 'pro',
    message: 'Manage chores, penalties, and household tasks with Pro.',
  },
  canUploadPhotos: {
    feature: 'photos',
    requiredTier: 'pro',
    message: 'Upload and share family photos with Pro.',
  },
  canUseLocation: {
    feature: 'location',
    requiredTier: 'pro',
    message: 'Keep your family connected with real-time location sharing on Pro.',
  },
  canUseAI: {
    feature: 'ai',
    requiredTier: 'pro',
    message: 'Get smart suggestions and AI-powered insights with Pro.',
  },
  canUseIntegrations: {
    feature: 'integrations',
    requiredTier: 'family',
    message: 'Connect Google Calendar, Apple Calendar, and more with Family.',
  },
  canUseEventProposals: {
    feature: 'calendar',
    requiredTier: 'pro',
    message: 'Propose events and find times that work for everyone with Pro.',
  },
};

/**
 * Build a professional upgrade nudge response for tier-gated features.
 * Returns a 403 response with enough data for the client to show an UpgradeModal.
 *
 * @param featureKey - The feature access key (e.g. 'canUseMealPlanning')
 * @param currentTier - The user's current subscription tier
 */
export function buildUpgradeResponse(featureKey: string, currentTier: SubscriptionTier): NextResponse {
  const nudge = UPGRADE_NUDGES[featureKey] ?? {
    feature: 'unknown',
    requiredTier: 'pro' as SubscriptionTier,
    message: 'This feature requires an upgraded subscription.',
  };

  return NextResponse.json(
    {
      error: 'upgrade_required',
      feature: nudge.feature,
      currentTier,
      requiredTier: nudge.requiredTier,
      message: nudge.message,
      upgradeUrl: '/pricing',
    },
    { status: 403 }
  );
}

/**
 * Check subscription tier without wrapping handler
 * Useful for inline checks within route handlers
 *
 * @param userId - The user ID to check
 * @param requiredTier - Minimum tier required
 * @returns Object with access status and details
 */
export async function checkSubscriptionTier(
  userId: string,
  requiredTier: SubscriptionTier
): Promise<{
  hasAccess: boolean;
  currentTier: SubscriptionTier;
  message?: string;
}> {
  const currentTier = await getUserTier(userId);
  const hasAccess = await hasTierAccess(userId, requiredTier);

  return {
    hasAccess,
    currentTier,
    message: hasAccess
      ? undefined
      : `This feature requires a ${requiredTier} subscription. Current tier: ${currentTier}`,
  };
}
