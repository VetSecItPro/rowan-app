/**
 * Subscription Management API Route
 * GET /api/subscriptions - Get current user's subscription details
 *
 * IMPORTANT: Server-side only - requires authentication
 *
 * DEV-ONLY: Add ?mockTier=free|pro|family|trial to test feature gating
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFeatureAccess } from '@/lib/services/feature-access-service';
import { getSubscriptionStatus } from '@/lib/services/subscription-service';
import type { SubscriptionTier } from '@/lib/types';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/**
 * GET handler - Get user's subscription details including features and usage
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // DEV ONLY: Allow mocking subscription tier for testing (before auth check)
    const mockTier = request.nextUrl.searchParams.get('mockTier') as SubscriptionTier | 'trial' | null;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev && mockTier) {
      logger.info(`[DEV] Mocking subscription tier: ${mockTier}`, { component: 'api-route' });

      // Return mock data for testing (bypasses auth for dev testing)
      const isTrialMock = mockTier === 'trial';
      const actualTier = isTrialMock ? 'free' : mockTier as SubscriptionTier;

      return NextResponse.json({
        tier: actualTier,
        trial: {
          isInTrial: isTrialMock,
          daysRemaining: isTrialMock ? 10 : 0,
          trialEndsAt: isTrialMock ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() : null,
          trialStartedAt: isTrialMock ? new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() : null,
        },
        subscription: {
          tier: actualTier,
          status: mockTier === 'free' ? 'none' : 'active',
          isActive: mockTier !== 'free',
          isPastDue: false,
          isCanceled: false,
          expiresAt: null,
          daysUntilExpiration: null,
        },
        features: {},
        limits: {},
        dailyUsage: {},
        _mock: true,
        _mockTier: mockTier,
      }, { status: 200 });
    }

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
    logger.error('Error fetching subscription:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}
