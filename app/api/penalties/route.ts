/**
 * Penalties API
 * GET /api/penalties - Get penalties for a space
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { getUserPenalties, getPenaltyStats, getOverdueChores } from '@/lib/services/rewards/late-penalty-service';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

/**
 * GET /api/penalties
 * Get penalties for a space
 * Query params:
 * - spaceId: required
 * - userId: optional (filter by user)
 * - includeForgiven: optional (include forgiven penalties)
 * - stats: optional (return stats instead of list)
 * - period: optional (for stats: 'week', 'month', 'all')
 * - overdue: optional (return overdue chores instead)
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

    // Verify subscription tier for household management
    const tierCheck = await canAccessFeature(user.id, 'canUseHousehold', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUseHousehold', tierCheck.tier ?? 'free');
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    const userId = searchParams.get('userId');
    const includeForgiven = searchParams.get('includeForgiven') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const period = searchParams.get('period') as 'week' | 'month' | 'all' | null;
    const overdue = searchParams.get('overdue') === 'true';

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

    // Return overdue chores list
    if (overdue) {
      const overdueChores = await getOverdueChores(spaceId);
      return NextResponse.json({ overdue: overdueChores });
    }

    // Return stats
    if (stats) {
      const penaltyStats = await getPenaltyStats(spaceId, period || 'month');
      return NextResponse.json({ stats: penaltyStats });
    }

    // Return user penalties
    const targetUserId = userId || user.id;
    const penalties = await getUserPenalties(targetUserId, spaceId, {
      includeForgiven,
      limit: 50,
    });

    return NextResponse.json({ penalties });
  } catch (error) {
    logger.error('Failed to get penalties', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
