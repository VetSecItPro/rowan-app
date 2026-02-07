/**
 * Chore Completion API
 * POST /api/chores/[choreId]/complete - Complete a chore with rewards and late penalties
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { applyLatePenalty, calculatePenalty, getSpacePenaltySettings } from '@/lib/services/rewards/late-penalty-service';
import type { Chore } from '@/lib/types';

interface RouteParams {
  params: Promise<{ choreId: string }>;
}

/**
 * POST /api/chores/[choreId]/complete
 * Complete a chore, award points, and apply late penalties if applicable
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

    // Get the chore
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('*')
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
      .select('id')
      .eq('space_id', chore.space_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this space' },
        { status: 403 }
      );
    }

    // Check if already completed
    if (chore.status === 'completed') {
      return NextResponse.json(
        { error: 'Chore is already completed' },
        { status: 400 }
      );
    }

    const completionDate = new Date();
    const completionDateISO = completionDate.toISOString();

    // Update the chore status to completed
    const { data: updatedChore, error: updateError } = await supabase
      .from('chores')
      .update({
        status: 'completed',
        completed_at: completionDateISO,
      })
      .eq('id', choreId)
      .select()
      .single();

    if (updateError) {
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

    // Apply late penalty if applicable
    let penaltyApplied = false;
    let penaltyPoints = 0;
    let daysLate = 0;

    if (chore.late_penalty_enabled && chore.due_date) {
      const settings = await getSpacePenaltySettings(chore.space_id);

      if (settings.enabled) {
        const penalty = calculatePenalty(
          new Date(chore.due_date),
          completionDate,
          settings,
          {
            penaltyPoints: chore.late_penalty_points,
            gracePeriodHours: chore.grace_period_hours,
          }
        );

        if (penalty.isLate && penalty.penaltyPoints > 0) {
          const penaltyResult = await applyLatePenalty({
            choreId,
            userId: user.id,
            spaceId: chore.space_id,
            completionDate: completionDateISO,
          });

          if (penaltyResult.success) {
            penaltyApplied = true;
            penaltyPoints = penaltyResult.pointsDeducted;
            daysLate = penalty.daysLate;
          }
        }
      }
    }

    // Calculate net points
    const netPoints = pointsAwarded - penaltyPoints;

    logger.info('Chore completed with rewards', {
      choreId,
      userId: user.id,
      pointsAwarded,
      streakBonus,
      penaltyApplied,
      penaltyPoints,
      netPoints,
    });

    return NextResponse.json({
      success: true,
      chore: updatedChore,
      rewards: {
        pointsAwarded,
        streakBonus,
        newStreak,
      },
      penalty: penaltyApplied ? {
        applied: true,
        pointsDeducted: penaltyPoints,
        daysLate,
      } : {
        applied: false,
        pointsDeducted: 0,
        daysLate: 0,
      },
      netPoints,
    });
  } catch (error) {
    logger.error('Chore completion error', error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
