/**
 * API Route: Get Polar Billing Information
 * GET /api/polar/billing-info
 *
 * Returns billing information for the authenticated user's subscription.
 * Detailed billing management (payment methods, invoices) is handled
 * through the Polar customer portal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface BillingInfo {
  hasBillingInfo: boolean;
  tier?: string;
  status?: string;
  currentPeriodEnd?: string;
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

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ hasBillingInfo: false });
    }

    // Only return billing info for active paid subscriptions
    if (subscription.status !== 'active' || subscription.tier === 'free') {
      return NextResponse.json({ hasBillingInfo: false });
    }

    const billingInfo: BillingInfo = {
      hasBillingInfo: true,
      tier: subscription.tier,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    logger.info('Fetched billing info', {
      component: 'PolarBillingInfoAPI',
      userId: user.id,
      tier: subscription.tier,
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
