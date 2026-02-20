/**
 * API Route: Get Polar Billing Information
 * GET /api/polar/billing-info
 *
 * Returns billing information for the authenticated user's subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPolarClient } from '@/lib/polar';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface BillingInfo {
  hasBillingInfo: boolean;
  nextBillingDate?: string;
  nextAmount?: number;
  currency?: string;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  status?: string;
  cancelAtPeriodEnd?: boolean;
}

/** Returns billing information for the authenticated user */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Polar client
    const polar = await getPolarClient();
    if (!polar) {
      logger.warn('Polar not configured', {
        component: 'PolarBillingInfoAPI',
        userId: user.id,
      });
      return NextResponse.json({
        hasBillingInfo: false,
      });
    }

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('polar_customer_id, polar_subscription_id, tier, status')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      logger.info('No subscription found for user', {
        component: 'PolarBillingInfoAPI',
        userId: user.id,
      });
      return NextResponse.json({
        hasBillingInfo: false,
      });
    }

    // Only fetch billing info for active paid subscriptions
    if (subscription.status !== 'active' || subscription.tier === 'free') {
      logger.info('User has no active paid subscription', {
        component: 'PolarBillingInfoAPI',
        userId: user.id,
        tier: subscription.tier,
        status: subscription.status,
      });
      return NextResponse.json({
        hasBillingInfo: false,
      });
    }

    if (!subscription.polar_subscription_id) {
      logger.warn('No polar_subscription_id found for active subscription', {
        component: 'PolarBillingInfoAPI',
        userId: user.id,
      });
      return NextResponse.json({
        hasBillingInfo: false,
      });
    }

    // Fetch subscription details from Polar
    logger.info('Fetching subscription from Polar', {
      component: 'PolarBillingInfoAPI',
      userId: user.id,
      polarSubscriptionId: subscription.polar_subscription_id,
    });

    const polarSubscription = await polar.subscriptions.get({
      id: subscription.polar_subscription_id,
    });

    if (!polarSubscription) {
      logger.error('Failed to fetch subscription from Polar', new Error('Subscription not found'), {
        component: 'PolarBillingInfoAPI',
        userId: user.id,
        polarSubscriptionId: subscription.polar_subscription_id,
      });
      return NextResponse.json({
        hasBillingInfo: false,
      });
    }

    // Build billing info response
    const billingInfo: BillingInfo = {
      hasBillingInfo: true,
      status: polarSubscription.status,
      cancelAtPeriodEnd: polarSubscription.cancelAtPeriodEnd,
      nextBillingDate: polarSubscription.currentPeriodEnd?.toISOString(),
      nextAmount: polarSubscription.amount ? polarSubscription.amount / 100 : undefined, // Convert cents to dollars
      currency: polarSubscription.currency?.toUpperCase(),
    };

    // Note: Polar does not expose payment method details through the API for security reasons
    // Payment method management is handled through the Polar customer portal

    logger.info('Successfully fetched billing info', {
      component: 'PolarBillingInfoAPI',
      userId: user.id,
      hasNextBillingDate: !!billingInfo.nextBillingDate,
      cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd,
    });

    return NextResponse.json(billingInfo);
  } catch (error) {
    logger.error('Billing info error:', error, {
      component: 'PolarBillingInfoAPI',
      action: 'GET',
    });

    return NextResponse.json(
      { error: 'Failed to fetch billing information. Please try again.' },
      { status: 500 }
    );
  }
}
