import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSpace } from '@/lib/services/spaces-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { getUserTier } from '@/lib/services/subscription-service';
import { getFeatureLimit } from '@/lib/config/feature-limits';

/**
 * POST /api/spaces/create
 * Create a new space
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(session.user);

    // Parse request body
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Space name is required' },
        { status: 400 }
      );
    }

    // Check space limit based on user's subscription tier
    const userTier = await getUserTier(session.user.id);
    const maxSpaces = getFeatureLimit(userTier, 'maxSpaces') as number;

    // Count user's current spaces (where they are the owner)
    const { count: currentSpaceCount, error: countError } = await supabase
      .from('space_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('role', 'owner');

    if (countError) {
      console.error('[API] Error counting user spaces:', countError);
      return NextResponse.json(
        { error: 'Failed to check space limit' },
        { status: 500 }
      );
    }

    const spaceCount = currentSpaceCount || 0;
    if (spaceCount >= maxSpaces) {
      const tierName = userTier === 'free' ? 'Free' : userTier === 'pro' ? 'Pro' : 'Family';
      return NextResponse.json(
        {
          error: `You've reached the maximum of ${maxSpaces} space${maxSpaces === 1 ? '' : 's'} for the ${tierName} plan. Upgrade to create more spaces.`,
          code: 'SPACE_LIMIT_REACHED',
          currentCount: spaceCount,
          limit: maxSpaces,
          tier: userTier,
        },
        { status: 403 }
      );
    }

    // Create space using service (pass server supabase client)
    const result = await createSpace(name.trim(), session.user.id, supabase);

    if (!result.success) {
      console.error('[API] Space creation failed:', result.error);
      console.error('[API] User ID:', session.user.id);
      console.error('[API] Space name:', name.trim());
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/spaces/create',
        method: 'POST',
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    console.error('[API] /api/spaces/create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
