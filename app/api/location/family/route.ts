import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFamilyLocations, getGeofenceEvents } from '@/lib/services/family-location-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { withUserDataCache } from '@/lib/utils/cache-headers';

/**
 * GET /api/location/family
 * Get all family members' locations for a space
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

    setSentryUser(user);

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');
    const includeEvents = searchParams.get('include_events') === 'true';
    const eventHours = parseInt(searchParams.get('event_hours') ?? '24', 10);

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
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

    // Get family locations
    const locations = await getFamilyLocations(spaceId, user.id, supabase);

    // Optionally get recent geofence events
    let events = null;
    if (includeEvents) {
      events = await getGeofenceEvents(spaceId, eventHours, supabase);
    }

    // Add cache headers (short cache for real-time data)
    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: {
          locations,
          events,
        },
      })
    );
  } catch (error) {
    logger.error('Get family locations error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-family',
      action: 'get_family_locations',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
