import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGeofenceEvents } from '@/lib/services/family-location-service';
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
 * GET /api/location/events
 * Get recent geofence events (arrivals/departures) for a space
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

    // Get params from query string
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');
    const hours = parseInt(searchParams.get('hours') ?? '24', 10);

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Validate hours parameter
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

    // Get events
    const events = await getGeofenceEvents(spaceId, hours, supabase);

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: events,
      })
    );
  } catch (error) {
    logger.error('Get geofence events error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-events',
      action: 'get_events',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
