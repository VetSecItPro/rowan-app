/**
 * Subscription Management API Route
 * GET /api/subscriptions - Get current user's subscription details
 *
 * IMPORTANT: Server-side only - requires authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFeatureAccess } from '@/lib/services/feature-access-service';
import { getSubscriptionStatus } from '@/lib/services/subscription-service';

/**
 * GET handler - Get user's subscription details including features and usage
 */
export async function GET(request: NextRequest) {
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

    // Get subscription status
    const subscriptionStatus = await getSubscriptionStatus(user.id);

    // Get feature access details
    const featureAccess = await getUserFeatureAccess(user.id);

    // Combine into comprehensive response
    const response = {
      // Top-level tier for easy access
      tier: subscriptionStatus.tier,

      // Trial status (for client-side trial banner/modal)
      trial: {
        isInTrial: subscriptionStatus.trial.isInTrial,
        daysRemaining: subscriptionStatus.trial.daysRemaining,
        trialEndsAt: subscriptionStatus.trial.trialEndsAt,
        trialStartedAt: subscriptionStatus.trial.trialStartedAt,
      },

      // Full subscription details
      subscription: {
        tier: subscriptionStatus.tier,
        status: subscriptionStatus.status,
        isActive: subscriptionStatus.isActive,
        isPastDue: subscriptionStatus.isPastDue,
        isCanceled: subscriptionStatus.isCanceled,
        expiresAt: subscriptionStatus.expiresAt,
        daysUntilExpiration: subscriptionStatus.daysUntilExpiration,
      },
      features: featureAccess.features,
      limits: featureAccess.limits,
      dailyUsage: featureAccess.dailyUsage,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}
