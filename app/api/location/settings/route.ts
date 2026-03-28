import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSharingSettings, updateSharingSettings } from '@/lib/services/family-location-service';
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

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const LocationSettingsUpdateSchema = z.object({
  space_id: z.string().uuid(),
  sharing_enabled: z.boolean().optional(),
  precision: z.enum(['exact', 'approximate', 'city', 'hidden']).optional(),
  history_retention_days: z.number().min(1).max(365).optional(),
  notify_arrivals: z.boolean().optional(),
  notify_departures: z.boolean().optional(),
  quiet_hours_start: z.string().regex(HH_MM_REGEX, 'Must be HH:MM format (00:00-23:59)').nullable().optional(),
  quiet_hours_end: z.string().regex(HH_MM_REGEX, 'Must be HH:MM format (00:00-23:59)').nullable().optional(),
});

/**
 * GET /api/location/settings
 * Get user's location sharing settings for a space
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

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

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

    // Get settings (creates defaults if none exist)
    const settings = await getSharingSettings(user.id, spaceId, supabase);

    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to retrieve settings' },
        { status: 500 }
      );
    }

    return withUserDataCache(
      NextResponse.json({
        success: true,
        data: settings,
      })
    );
  } catch (error) {
    logger.error('Get location settings error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-settings',
      action: 'get_settings',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/location/settings
 * Update user's location sharing settings
 */
export async function PUT(req: NextRequest) {
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

    // Parse and validate request body
    const body = await req.json();
    const parsed = LocationSettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { space_id, ...updateData } = parsed.data;

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, space_id);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Update settings
    const result = await updateSharingSettings(user.id, space_id, updateData, supabase);

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
    logger.error('Update location settings error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-settings',
      action: 'update_settings',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
