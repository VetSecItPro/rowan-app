/**
 * Push Token Registration API
 * POST /api/push/register - Register a push notification token
 * DELETE /api/push/register - Unregister a push notification token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { registerPushToken, unregisterPushToken } from '@/lib/services/push-notification-service';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const registerSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  platform: z.enum(['ios', 'android', 'web']),
  deviceName: z.string().optional(),
  spaceId: z.string().uuid('Invalid space ID'),
});

const unregisterSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/push/register
 * Register a push notification token for the current user
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, platform, deviceName, spaceId } = validated.data;

    // Verify user is member of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('id')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this space' },
        { status: 403 }
      );
    }

    const result = await registerPushToken(user.id, spaceId, {
      token,
      platform,
      deviceName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.info('Push token registered via API', {
      userId: user.id,
      platform,
      spaceId,
    });

    return NextResponse.json({
      success: true,
      tokenId: result.tokenId,
    });
  } catch (error) {
    logger.error('Push registration error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/register
 * Unregister a push notification token
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = unregisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await unregisterPushToken(user.id, validated.data.token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.info('Push token unregistered via API', { userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push unregistration error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
