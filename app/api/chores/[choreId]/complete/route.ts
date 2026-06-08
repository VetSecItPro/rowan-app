/**
 * Chore Completion API
 * POST /api/chores/[choreId]/complete - Complete a chore and award points
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import type { Chore } from '@/lib/types';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

interface RouteParams {
  params: Promise<{ choreId: string }>;
}

/**
 * POST /api/chores/[choreId]/complete
 * Complete a chore and award points
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { choreId } = await params;
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

    // Get the chore
    // nosemgrep: supabase-missing-space-id-filter — fetched by chore PK (.eq id); the caller's space membership is authorized separately below via space_members before any mutation
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('id, title, space_id, status, due_date, point_value')
      .eq('id', choreId)
      .single();

    if (choreError || !chore) {
      return NextResponse.json(
        { error: 'Chore not found' },
        { status: 404 }
      );
    }

    // Verify user is in the space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('space_id', chore.space_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this space' },
        { status: 403 }
      );
    }

    // Quick fast-path check (UX) — if already completed, return 400 without
    // attempting the update. This is NOT the race-safe guard; the actual
    // race-safe guard is the conditional UPDATE below.
    if (chore.status === 'completed') {
      return NextResponse.json(
        { error: 'Chore is already completed' },
        { status: 400 }
      );
    }

    const completionDate = new Date();
    const completionDateISO = completionDate.toISOString();

    // Race-safe atomic state transition: only succeed if the row's status
    // is still NOT 'completed' at update time. Postgres serializes UPDATEs
    // on the same row — exactly one of N concurrent requests will match
    // and flip the status; the others will see zero rows updated and
    // bail out with the already-completed error.
    //
    // RT-302 (red-team 2026-05-03): without this guard, 10 concurrent
    // POSTs all passed the line-84 check, all UPDATEd successfully, and
    // all called complete_chore_award_points — awarding ~7x the intended
    // points for a single completion. The .neq('status','completed')
    // predicate is the canonical "compare-and-swap" fix.
    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update({
        status: 'completed',
        completed_at: completionDateISO,
      })
      .eq('id', choreId)
      .neq('status', 'completed')
      .select()
      .single();

    if (updateError) {
      // PGRST116 = "no rows returned" → another concurrent request won
      // the race and already marked this chore completed. Return 400
      // (matching the fast-path response) so the caller sees consistent
      // behavior regardless of which path detected the duplicate.
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Chore is already completed' },
          { status: 400 }
        );
      }
      throw updateError;
    }

    // Award base points atomically via RPC (prevents race condition on concurrent completions)
    const basePoints = (chore as Chore & { point_value?: number }).point_value ?? 10;
    let pointsAwarded = 0;
    let streakBonus = 0;
    let newStreak = 0;

    try {
      const { data: rewardResult, error: rewardError } = await supabase.rpc(
        'complete_chore_award_points',
        {
          p_user_id: user.id,
          p_space_id: chore.space_id,
          p_chore_id: choreId,
          p_chore_title: chore.title,
          p_base_points: basePoints,
          p_completion_date: completionDateISO,
        }
      );

      if (rewardError) throw rewardError;

      pointsAwarded = rewardResult?.points_awarded ?? basePoints;
      streakBonus = rewardResult?.streak_bonus ?? 0;
      newStreak = rewardResult?.new_streak ?? 1;
    } catch (rpcError) {
      logger.error('Failed to award points', rpcError instanceof Error ? rpcError : undefined, {
        choreId,
        userId: user.id,
      });
      // Continue even if points fail - chore is still completed
    }

    logger.info('Chore completed with rewards', {
      choreId,
      userId: user.id,
      pointsAwarded,
      streakBonus,
    });

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      rewards: {
        pointsAwarded,
        streakBonus,
        newStreak,
      },
      netPoints: pointsAwarded,
    });
  } catch (error) {
    logger.error('Chore completion error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
