/**
 * API Route: Create Polar Customer Portal Session
 * POST /api/polar/portal
 *
 * Creates a Polar customer portal session URL for managing subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPolarClient } from '@/lib/polar';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { validateCsrfRequest } from '@/lib/security/csrf-validation';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;

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
      return NextResponse.json(
        { error: 'Polar not configured. Install @polar-sh/sdk and set POLAR_ACCESS_TOKEN.' },
        { status: 503 }
      );
    }

    // Get user's Polar customer ID from subscription record
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('polar_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.polar_customer_id) {
      // No Polar customer ID - redirect to Polar dashboard for manual management
      logger.warn('No polar_customer_id found for user', {
        component: 'PolarPortalAPI',
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: 'No subscription found. Please contact support if you believe this is an error.',
          fallbackUrl: 'https://polar.sh/settings'
        },
        { status: 400 }
      );
    }

    // Create Polar customer session
    logger.info('Creating portal session for customer', {
      component: 'PolarPortalAPI',
      userId: user.id,
      polarCustomerId: subscription.polar_customer_id,
    });

    const session = await polar.customerSessions.create({
      customerId: subscription.polar_customer_id,
    });

    return NextResponse.json({
      url: session.customerPortalUrl,
    });
  } catch (error) {
    logger.error('Polar portal error:', error, {
      component: 'PolarPortalAPI',
      action: 'POST',
    });

    return NextResponse.json(
      { error: 'Failed to create portal session. Please try again.' },
      { status: 500 }
    );
  }
}
