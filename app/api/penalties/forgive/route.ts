/**
 * Penalty Forgiveness API
 * POST /api/penalties/forgive - Forgive a late penalty and refund points
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { forgivePenalty, getSpacePenaltySettings } from '@/lib/services/rewards/late-penalty-service';
import { z } from 'zod';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

const forgiveSchema = z.object({
  penaltyId: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
});

/**
 * POST /api/penalties/forgive
 * Forgive a late penalty (admin/owner only)
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

    // Verify subscription tier for household management
    const tierCheck = await canAccessFeature(user.id, 'canUseHousehold', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUseHousehold', tierCheck.tier ?? 'free');
    }

    const body = await request.json();
    const validated = forgiveSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { penaltyId, reason } = validated.data;

    // Get the penalty to check space membership
    const { data: penalty, error: penaltyError } = await supabase
      .from('late_penalties')
      .select('space_id, user_id, points_deducted, is_forgiven')
      .eq('id', penaltyId)
      .single();

    if (penaltyError || !penalty) {
      return NextResponse.json(
        { error: 'Penalty not found' },
        { status: 404 }
      );
    }

    if (penalty.is_forgiven) {
      return NextResponse.json(
        { error: 'Penalty has already been forgiven' },
        { status: 400 }
      );
    }

    // Verify user is admin/owner of the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', penalty.space_id)
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
        { error: 'Only admins can forgive penalties' },
        { status: 403 }
      );
    }

    // Check if forgiveness is allowed in this space
    const settings = await getSpacePenaltySettings(penalty.space_id);
    if (!settings.forgiveness_allowed) {
      return NextResponse.json(
        { error: 'Forgiveness is not allowed in this space' },
        { status: 400 }
      );
    }

    const result = await forgivePenalty({
      penaltyId,
      forgivenBy: user.id,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    logger.info('Penalty forgiven via API', {
      penaltyId,
      forgivenBy: user.id,
      pointsRefunded: result.pointsRefunded,
    });

    return NextResponse.json({
      success: true,
      pointsRefunded: result.pointsRefunded,
    });
  } catch (error) {
    logger.error('Failed to forgive penalty', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
