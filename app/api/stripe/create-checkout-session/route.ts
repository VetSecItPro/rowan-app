/**
 * API Route: Create Stripe Checkout Session
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe checkout session for subscription purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createCheckoutSession } from '../../../../lib/stripe/checkout';
import type { SubscriptionTier, SubscriptionPeriod } from '../../../../lib/types';
import { z } from 'zod';

// Request body validation schema
const CreateCheckoutSessionSchema = z.object({
  tier: z.enum(['pro', 'family']),
  period: z.enum(['monthly', 'annual']),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateCheckoutSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { tier, period } = validation.data;

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', user.id)
      .single();

    if (existingSub && existingSub.status === 'active') {
      return NextResponse.json(
        {
          error: 'Already subscribed',
          message: `You already have an active ${existingSub.tier} subscription. Please manage your subscription in account settings.`
        },
        { status: 400 }
      );
    }

    // Create checkout session
    const sessionId = await createCheckoutSession(
      user.id,
      user.email!,
      tier as Exclude<SubscriptionTier, 'free'>,
      period as SubscriptionPeriod
    );

    // Return session ID to client
    return NextResponse.json({ sessionId });

  } catch (error) {
    console.error('Error creating checkout session:', error);

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
