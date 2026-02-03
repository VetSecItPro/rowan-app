import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateUserLocation } from '@/lib/services/family-location-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/** Zod schema for location update request body */
const LocationUpdateRequestSchema = z.object({
  space_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  altitude: z.number().optional(),
  altitude_accuracy: z.number().positive().optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  battery_level: z.number().min(0).max(1).optional(),
  is_charging: z.boolean().optional(),
  recorded_at: z.string().datetime().optional(),
}).strict();

/**
 * POST /api/location/update
 * Update the current user's location
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (location updates can be frequent, so allow more)
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

    // Parse and validate request body
    const body = await req.json();
    const parseResult = LocationUpdateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues.map(i => i.message) },
        { status: 400 }
      );
    }

    const { space_id, ...locationData } = parseResult.data;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Update location
    const result = await updateUserLocation(user.id, space_id, locationData, supabase);

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
    logger.error('Location update error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-update',
      action: 'location_update',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
