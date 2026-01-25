/**
 * Penalty Settings API
 * GET /api/penalties/settings - Get penalty settings for a space
 * PUT /api/penalties/settings - Update penalty settings for a space
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { getSpacePenaltySettings, updateSpacePenaltySettings } from '@/lib/services/rewards/late-penalty-service';
import { z } from 'zod';

const settingsSchema = z.object({
  spaceId: z.string().uuid(),
  settings: z.object({
    enabled: z.boolean().optional(),
    default_penalty_points: z.number().min(1).max(100).optional(),
    default_grace_period_hours: z.number().min(0).max(168).optional(),
    max_penalty_per_chore: z.number().min(1).max(500).optional(),
    progressive_penalty: z.boolean().optional(),
    penalty_multiplier_per_day: z.number().min(1).max(5).optional(),
    exclude_weekends: z.boolean().optional(),
    forgiveness_allowed: z.boolean().optional(),
  }),
});

/**
 * GET /api/penalties/settings
 * Get penalty settings for a space
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'Space ID is required' },
        { status: 400 }
      );
    }

    // Verify user is member of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this space' },
        { status: 403 }
      );
    }

    const settings = await getSpacePenaltySettings(spaceId);

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Failed to get penalty settings', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/penalties/settings
 * Update penalty settings for a space (admin/owner only)
 */
export async function PUT(request: NextRequest) {
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
    const validated = settingsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { spaceId, settings } = validated.data;

    // Verify user is admin/owner of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this space' },
        { status: 403 }
      );
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can update penalty settings' },
        { status: 403 }
      );
    }

    const result = await updateSpacePenaltySettings(spaceId, settings);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.info('Penalty settings updated', { spaceId, userId: user.id });

    // Return updated settings
    const updatedSettings = await getSpacePenaltySettings(spaceId);

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    logger.error('Failed to update penalty settings', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
