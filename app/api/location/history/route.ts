import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLocationHistory, getSharingSettings } from '@/lib/services/family-location-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { withUserDataCache } from '@/lib/utils/cache-headers';
import { getUserTier } from '@/lib/services/subscription-service';
import { getFeatureLimits } from '@/lib/config/feature-limits';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

/**
 * GET /api/location/history
 * Get location history for a specific user in a space.
 * Only the user themselves or space members can view (RLS handles this).
 * Respects privacy settings — if sharing is disabled, returns empty.
 */
export async function GET(req: NextRequest) {
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

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify subscription tier for location features
    const userTier = await getUserTier(user.id, supabase);
    const limits = getFeatureLimits(userTier);
    if (!limits.canUseLocation) {
      return buildUpgradeResponse('canUseLocation', userTier);
    }

    setSentryUser(user);

    // Get params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');
    const targetUserId = searchParams.get('user_id') ?? user.id;
    const hours = parseInt(searchParams.get('hours') ?? '24', 10);

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Validate hours parameter (1h to 7 days)
    if (isNaN(hours) || hours < 1 || hours > 168) {
      return NextResponse.json(
        { error: 'hours must be between 1 and 168' },
        { status: 400 }
      );
    }

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, spaceId);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // If requesting another user's history, check their privacy settings
    if (targetUserId !== user.id) {
      const targetSettings = await getSharingSettings(targetUserId, spaceId, supabase);
      if (targetSettings && !targetSettings.sharing_enabled) {
        return withUserDataCache(
          NextResponse.json({
            success: true,
            data: [],
            message: 'This user has sharing disabled',
          })
        );
      }
    }

    // Get location history
    const history = await getLocationHistory(targetUserId, spaceId, hours, supabase);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: history,
      })
    );
  } catch (error) {
    logger.error('Get location history error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-history',
      action: 'get_history',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
