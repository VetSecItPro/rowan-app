/**
 * API Route: Create Polar Checkout Session
 * POST /api/polar/checkout
 *
 * Creates a Polar checkout session and returns the checkout URL for redirect
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPolarClient, POLAR_PLANS, getProductId } from '@/lib/polar';
import type { SubscriptionTier, SubscriptionPeriod } from '@/lib/types';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Request body validation schema
const CreateCheckoutSchema = z.object({
  plan: z.enum(['pro', 'family']),
  billingInterval: z.enum(['monthly', 'annual']).default('monthly'),
});

/** Creates a Polar checkout session for subscription purchase */
export async function POST(request: NextRequest) {
  try {
    // CSRF validation for defense-in-depth
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

    // Rate limiting to prevent checkout abuse
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Polar client
    const polar = await getPolarClient();
    if (!polar) {
      return NextResponse.json(
        { error: 'Polar not configured. Install @polar-sh/sdk and set POLAR_ACCESS_TOKEN.' },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateCheckoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { plan, billingInterval } = validation.data;

    // Validate plan exists in POLAR_PLANS
    if (!(plan in POLAR_PLANS)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get product ID
    const productId = getProductId(plan as SubscriptionTier, billingInterval as SubscriptionPeriod);

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID not configured for this plan. Check environment variables.' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    if (existingSub && existingSub.status === 'active' && existingSub.tier !== 'free') {
      return NextResponse.json(
        {
          error: 'Already subscribed',
          message: `You already have an active ${existingSub.tier} subscription. Please manage your subscription in account settings.`
        },
        { status: 400 }
      );
    }

    // Create Polar checkout session
    // Polar SDK v0.42+ uses products array instead of single productId
    // Note: customerEmail is optional - Polar validates email domains strictly
    // so we only include it if we're confident the domain exists
    const checkout = await polar.checkouts.create({
      products: [productId],
      // Don't pass customerEmail - let Polar collect it during checkout
      // This avoids validation failures for test/staging email domains
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?provider=polar&plan=${plan}`,
      metadata: {
        userId: user.id,
        plan,
        billingInterval,
      },
    });

    logger.info('Polar checkout session created', {
      component: 'PolarCheckoutAPI',
      action: 'POST',
      userId: user.id,
      plan,
      billingInterval,
      checkoutId: checkout.id,
    });

    return NextResponse.json({
      url: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    logger.error('Polar checkout error:', error, {
      component: 'PolarCheckoutAPI',
      action: 'POST',
    });

    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}
