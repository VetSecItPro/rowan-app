import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSpace } from '@/lib/services/spaces-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { getUserTier } from '@/lib/services/subscription-service';
import { getFeatureLimit } from '@/lib/config/feature-limits';
import { z } from 'zod';
import { validateAndSanitizeSpace } from '@/lib/validations/space-schemas';

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }


    // Set user context for Sentry error tracking
    setSentryUser(user);

    // Parse and validate request body with Zod
    const body = await req.json();
    let validatedData;
    try {
      validatedData = validateAndSanitizeSpace(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    // Check space limit based on user's subscription tier
    const userTier = await getUserTier(user.id);
    const maxSpaces = getFeatureLimit(userTier, 'maxSpaces') as number;

    // Count user's current spaces (where they are the owner)
    const { count: currentSpaceCount, error: countError } = await supabase
      .from('space_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'owner');

    if (countError) {
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
    const result = await createSpace(validatedData.name, user.id, supabase);

    if (!result.success) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
