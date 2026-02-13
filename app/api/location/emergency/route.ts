import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/services/push-notification-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { verifySpaceAccess } from '@/lib/services/authorization-service';
import * as Sentry from '@sentry/nextjs';
import { setSentryUser } from '@/lib/sentry-utils';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { getUserTier } from '@/lib/services/subscription-service';
import { getFeatureLimits } from '@/lib/config/feature-limits';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

const emergencySchema = z.object({
  space_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  message: z.string().max(200).optional(),
});

/**
 * POST /api/location/emergency
 * Trigger an emergency alert — shares exact location with all family members
 * regardless of privacy settings, sends urgent push notification.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting (stricter — 3 per hour to prevent abuse)
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

    // Parse and validate body
    const body = await req.json();
    const validated = emergencySchema.parse(body);

    // Verify user has access to this space
    try {
      await verifySpaceAccess(user.id, validated.space_id);
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // 1. Record the emergency location (overrides any privacy settings)
    await supabase.from('user_locations').insert({
      user_id: user.id,
      space_id: validated.space_id,
      latitude: validated.latitude,
      longitude: validated.longitude,
      accuracy: validated.accuracy ?? null,
      recorded_at: new Date().toISOString(),
    });

    // 2. Get all other family members in the space
    const { data: members } = await supabase
      .from('space_members')
      .select('user_id')
      .eq('space_id', validated.space_id)
      .neq('user_id', user.id);

    const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Emergency alert sent but no other family members found',
        notified: 0,
      });
    }

    // 3. Get the user's display name
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    const userName = profile?.name ?? 'A family member';

    // 4. Send urgent push notification to all family members
    const mapsUrl = `https://maps.google.com/?q=${validated.latitude},${validated.longitude}`;
    const emergencyMessage = validated.message
      ? `${userName} needs help: "${validated.message}"`
      : `${userName} triggered an emergency alert`;

    const result = await sendPushNotification({
      userIds: memberIds,
      spaceId: validated.space_id,
      notification: {
        title: 'Emergency Alert',
        body: emergencyMessage,
        sound: 'emergency',
        data: {
          type: 'emergency',
          latitude: String(validated.latitude),
          longitude: String(validated.longitude),
          mapsUrl,
          userId: user.id,
        },
      },
      type: 'location_emergency',
    });

    logger.info('Emergency alert triggered', {
      userId: user.id,
      spaceId: validated.space_id,
      notified: memberIds.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency alert sent to all family members',
      notified: memberIds.length,
      pushResults: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Emergency alert error', error instanceof Error ? error : new Error('Unknown error'), {
      component: 'api-location-emergency',
      action: 'trigger_emergency',
    });
    Sentry.captureException(error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
