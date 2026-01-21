import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { extractIP } from '@/lib/ratelimit-fallback';

/**
 * GET /api/beta/transition
 * Check if user is eligible for beta-to-paid transition
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's beta status
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_beta_tester, beta_status, beta_ends_at, transitioned_to_paid, transitioned_at')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is a beta tester
    if (!userData.is_beta_tester) {
      return NextResponse.json({
        eligible: false,
        reason: 'Not a beta tester',
      });
    }

    // Check if already transitioned
    if (userData.transitioned_to_paid) {
      return NextResponse.json({
        eligible: false,
        reason: 'Already transitioned to paid account',
        transitioned_at: userData.transitioned_at,
      });
    }

    // Check beta expiration
    const betaEndsAt = userData.beta_ends_at ? new Date(userData.beta_ends_at) : new Date('2026-02-15');
    const now = new Date();
    const daysRemaining = Math.ceil((betaEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if transition is enabled
    const { data: configData } = await supabase
      .from('beta_config')
      .select('value')
      .eq('key', 'transition_to_paid_enabled')
      .single();

    const transitionEnabled = configData?.value === true || configData?.value === 'true';

    return NextResponse.json({
      eligible: true,
      transition_enabled: transitionEnabled,
      beta_ends_at: betaEndsAt.toISOString(),
      days_remaining: daysRemaining,
      offers: [
        {
          id: 'early_bird',
          name: 'Early Bird Annual',
          description: '50% off first year for beta testers',
          discount_percent: 50,
          billing_period: 'annual',
          available_until: '2026-03-15',
        },
        {
          id: 'beta_monthly',
          name: 'Beta Tester Monthly',
          description: '25% off monthly for 6 months',
          discount_percent: 25,
          billing_period: 'monthly',
          duration_months: 6,
          available_until: '2026-03-15',
        },
      ],
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to check transition eligibility' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/beta/transition
 * Initiate beta-to-paid transition
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { offer_id } = body;

    if (!offer_id) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Verify user is eligible
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_beta_tester, beta_status, transitioned_to_paid')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!userData.is_beta_tester) {
      return NextResponse.json(
        { error: 'Not eligible for beta transition' },
        { status: 403 }
      );
    }

    if (userData.transitioned_to_paid) {
      return NextResponse.json(
        { error: 'Already transitioned to paid account' },
        { status: 400 }
      );
    }

    // Check if transition is enabled
    const { data: configData } = await supabase
      .from('beta_config')
      .select('value')
      .eq('key', 'transition_to_paid_enabled')
      .single();

    const transitionEnabled = configData?.value === true || configData?.value === 'true';

    if (!transitionEnabled) {
      return NextResponse.json(
        { error: 'Beta-to-paid transition is not yet available. Check back closer to the beta end date.' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session with beta discount
    // This would integrate with your existing Stripe setup
    // For now, we'll return a placeholder response

    // Mark transition as initiated (not completed until payment succeeds)
    await supabase
      .from('users')
      .update({
        // Don't mark as transitioned yet - wait for successful payment
        // transitioned_to_paid: true,
        // transitioned_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // TODO: Create Stripe checkout session with appropriate discount
    // based on offer_id (early_bird = 50% off, beta_monthly = 25% off)

    return NextResponse.json({
      success: true,
      message: 'Transition initiated. Complete payment to activate your subscription.',
      offer_id,
      // checkout_url: stripeCheckoutUrl, // Add when Stripe integration is ready
      next_steps: [
        'Complete the payment process',
        'Your beta tester data will be preserved',
        'Subscription starts immediately after payment',
        'Beta discount applied automatically',
      ],
    });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: 'Failed to initiate transition' },
      { status: 500 }
    );
  }
}
