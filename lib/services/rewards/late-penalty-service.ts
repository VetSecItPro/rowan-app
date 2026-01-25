/**
 * Late Penalty Service
 *
 * Handles penalty point deductions for late chore completion.
 * Integrates with the rewards system to deduct points and track penalties.
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export interface LatePenalty {
  id: string;
  space_id: string;
  chore_id: string;
  user_id: string;
  points_deducted: number;
  days_late: number;
  due_date: string;
  completion_date: string | null;
  penalty_type: 'daily_accrual' | 'completion_late' | 'manual';
  is_forgiven: boolean;
  forgiven_by: string | null;
  forgiven_at: string | null;
  forgiven_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LatePenaltySettings {
  enabled: boolean;
  default_penalty_points: number;
  default_grace_period_hours: number;
  max_penalty_per_chore: number;
  progressive_penalty: boolean;
  penalty_multiplier_per_day: number;
  exclude_weekends: boolean;
  forgiveness_allowed: boolean;
}

export interface PenaltyCalculation {
  isLate: boolean;
  daysLate: number;
  penaltyPoints: number;
  deadline: Date;
  graceDeadline: Date;
}

export interface ApplyPenaltyResult {
  success: boolean;
  penalty?: LatePenalty;
  pointsDeducted: number;
  newBalance?: number;
  error?: string;
}

// Default settings
export const DEFAULT_PENALTY_SETTINGS: LatePenaltySettings = {
  enabled: false,
  default_penalty_points: 5,
  default_grace_period_hours: 2,
  max_penalty_per_chore: 50,
  progressive_penalty: true,
  penalty_multiplier_per_day: 1.5,
  exclude_weekends: false,
  forgiveness_allowed: true,
};

// ============================================================================
// Validation Schemas
// ============================================================================

const applyPenaltySchema = z.object({
  choreId: z.string().uuid(),
  userId: z.string().uuid(),
  spaceId: z.string().uuid(),
  completionDate: z.string().datetime().optional(),
});

const forgivePenaltySchema = z.object({
  penaltyId: z.string().uuid(),
  forgivenBy: z.string().uuid(),
  reason: z.string().min(1).max(500).optional(),
});

// ============================================================================
// Penalty Settings
// ============================================================================

/**
 * Get penalty settings for a space
 */
export async function getSpacePenaltySettings(
  spaceId: string
): Promise<LatePenaltySettings> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('spaces')
      .select('late_penalty_settings')
      .eq('id', spaceId)
      .single();

    if (error || !data?.late_penalty_settings) {
      return DEFAULT_PENALTY_SETTINGS;
    }

    return {
      ...DEFAULT_PENALTY_SETTINGS,
      ...data.late_penalty_settings,
    };
  } catch (error) {
    logger.error('Failed to get penalty settings', error instanceof Error ? error : undefined, { spaceId });
    return DEFAULT_PENALTY_SETTINGS;
  }
}

/**
 * Update penalty settings for a space
 */
export async function updateSpacePenaltySettings(
  spaceId: string,
  settings: Partial<LatePenaltySettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const currentSettings = await getSpacePenaltySettings(spaceId);
    const newSettings = { ...currentSettings, ...settings };

    const { error } = await supabase
      .from('spaces')
      .update({ late_penalty_settings: newSettings })
      .eq('id', spaceId);

    if (error) throw error;

    logger.info('Updated penalty settings', { spaceId, enabled: newSettings.enabled });
    return { success: true };
  } catch (error) {
    logger.error('Failed to update penalty settings', error instanceof Error ? error : undefined, { spaceId });
    return { success: false, error: 'Failed to update settings' };
  }
}

// ============================================================================
// Penalty Calculation
// ============================================================================

/**
 * Calculate penalty for a chore based on completion timing
 */
export function calculatePenalty(
  dueDate: Date,
  completionDate: Date,
  settings: LatePenaltySettings,
  choreOverrides?: {
    penaltyPoints?: number;
    gracePeriodHours?: number;
  }
): PenaltyCalculation {
  const gracePeriodHours = choreOverrides?.gracePeriodHours ?? settings.default_grace_period_hours;
  const basePenalty = choreOverrides?.penaltyPoints ?? settings.default_penalty_points;

  // Calculate deadline with grace period
  const graceDeadline = new Date(dueDate.getTime() + gracePeriodHours * 60 * 60 * 1000);

  // Not late if completed before grace deadline
  if (completionDate <= graceDeadline) {
    return {
      isLate: false,
      daysLate: 0,
      penaltyPoints: 0,
      deadline: dueDate,
      graceDeadline,
    };
  }

  // Calculate days late (rounded up)
  const msLate = completionDate.getTime() - graceDeadline.getTime();
  const daysLate = Math.ceil(msLate / (24 * 60 * 60 * 1000));

  // Calculate penalty points
  let penaltyPoints: number;

  if (settings.progressive_penalty) {
    // Progressive: base * multiplier^(days-1), capped
    penaltyPoints = Math.min(
      Math.ceil(basePenalty * Math.pow(settings.penalty_multiplier_per_day, daysLate - 1)),
      settings.max_penalty_per_chore
    );
  } else {
    // Flat: base * days, capped
    penaltyPoints = Math.min(basePenalty * daysLate, settings.max_penalty_per_chore);
  }

  return {
    isLate: true,
    daysLate,
    penaltyPoints,
    deadline: dueDate,
    graceDeadline,
  };
}

/**
 * Check if a chore is currently overdue
 */
export function isChoreOverdue(
  dueDate: Date | string | null | undefined,
  gracePeriodHours: number = 2
): boolean {
  if (!dueDate) return false;

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const graceDeadline = new Date(due.getTime() + gracePeriodHours * 60 * 60 * 1000);

  return new Date() > graceDeadline;
}

/**
 * Get days overdue for a chore
 */
export function getDaysOverdue(
  dueDate: Date | string | null | undefined,
  gracePeriodHours: number = 2
): number {
  if (!dueDate) return 0;

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const graceDeadline = new Date(due.getTime() + gracePeriodHours * 60 * 60 * 1000);
  const now = new Date();

  if (now <= graceDeadline) return 0;

  return Math.ceil((now.getTime() - graceDeadline.getTime()) / (24 * 60 * 60 * 1000));
}

// ============================================================================
// Penalty Application
// ============================================================================

/**
 * Apply late penalty when completing a chore late
 */
export async function applyLatePenalty(
  input: z.infer<typeof applyPenaltySchema>
): Promise<ApplyPenaltyResult> {
  try {
    const validated = applyPenaltySchema.parse(input);
    const supabase = await createClient();

    // Get the chore details
    const { data: chore, error: choreError } = await supabase
      .from('chores')
      .select('*')
      .eq('id', validated.choreId)
      .single();

    if (choreError || !chore) {
      return { success: false, pointsDeducted: 0, error: 'Chore not found' };
    }

    // Check if penalty is enabled for this chore
    if (!chore.late_penalty_enabled) {
      return { success: true, pointsDeducted: 0 };
    }

    // Get space penalty settings
    const settings = await getSpacePenaltySettings(validated.spaceId);

    if (!settings.enabled) {
      return { success: true, pointsDeducted: 0 };
    }

    // Check if chore has a due date
    if (!chore.due_date) {
      return { success: true, pointsDeducted: 0 };
    }

    // Calculate penalty
    const completionDate = validated.completionDate
      ? new Date(validated.completionDate)
      : new Date();

    const penalty = calculatePenalty(
      new Date(chore.due_date),
      completionDate,
      settings,
      {
        penaltyPoints: chore.late_penalty_points,
        gracePeriodHours: chore.grace_period_hours,
      }
    );

    if (!penalty.isLate || penalty.penaltyPoints === 0) {
      return { success: true, pointsDeducted: 0 };
    }

    // Get user's current points
    const { data: pointsRecord, error: pointsError } = await supabase
      .from('reward_points')
      .select('id, points')
      .eq('user_id', validated.userId)
      .eq('space_id', validated.spaceId)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') {
      throw pointsError;
    }

    // Create or get points record
    let currentPoints = pointsRecord?.points ?? 0;
    let pointsRecordId = pointsRecord?.id;

    if (!pointsRecordId) {
      const { data: newRecord, error: createError } = await supabase
        .from('reward_points')
        .insert({
          user_id: validated.userId,
          space_id: validated.spaceId,
          points: 0,
        })
        .select('id')
        .single();

      if (createError) throw createError;
      pointsRecordId = newRecord.id;
      currentPoints = 0;
    }

    // Deduct points (can go negative or cap at 0 based on preference)
    const newBalance = Math.max(0, currentPoints - penalty.penaltyPoints);
    const actualDeduction = currentPoints - newBalance;

    // Update points balance
    const { error: updateError } = await supabase
      .from('reward_points')
      .update({ points: newBalance, updated_at: new Date().toISOString() })
      .eq('id', pointsRecordId);

    if (updateError) throw updateError;

    // Record the penalty transaction
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: validated.userId,
        space_id: validated.spaceId,
        source_type: 'late_penalty',
        source_id: validated.choreId,
        points: -actualDeduction,
        reason: `Late penalty for "${chore.title}" (${penalty.daysLate} day${penalty.daysLate > 1 ? 's' : ''} late)`,
        metadata: {
          chore_title: chore.title,
          days_late: penalty.daysLate,
          due_date: chore.due_date,
          completion_date: completionDate.toISOString(),
        },
      });

    if (transactionError) throw transactionError;

    // Record in late_penalties audit table
    const { data: penaltyRecord, error: penaltyError } = await supabase
      .from('late_penalties')
      .insert({
        space_id: validated.spaceId,
        chore_id: validated.choreId,
        user_id: validated.userId,
        points_deducted: actualDeduction,
        days_late: penalty.daysLate,
        due_date: chore.due_date,
        completion_date: completionDate.toISOString(),
        penalty_type: 'completion_late',
      })
      .select()
      .single();

    if (penaltyError) throw penaltyError;

    // Update chore with penalty info
    await supabase
      .from('chores')
      .update({
        penalty_applied_at: new Date().toISOString(),
        penalty_points_deducted: (chore.penalty_points_deducted || 0) + actualDeduction,
      })
      .eq('id', validated.choreId);

    logger.info('Late penalty applied', {
      choreId: validated.choreId,
      userId: validated.userId,
      pointsDeducted: actualDeduction,
      daysLate: penalty.daysLate,
    });

    return {
      success: true,
      penalty: penaltyRecord,
      pointsDeducted: actualDeduction,
      newBalance,
    };
  } catch (error) {
    logger.error('Failed to apply late penalty', error instanceof Error ? error : undefined);
    return { success: false, pointsDeducted: 0, error: 'Failed to apply penalty' };
  }
}

// ============================================================================
// Penalty Forgiveness
// ============================================================================

/**
 * Forgive a late penalty (refund points)
 */
export async function forgivePenalty(
  input: z.infer<typeof forgivePenaltySchema>
): Promise<{ success: boolean; pointsRefunded: number; error?: string }> {
  try {
    const validated = forgivePenaltySchema.parse(input);
    const supabase = await createClient();

    // Get the penalty record
    const { data: penalty, error: penaltyError } = await supabase
      .from('late_penalties')
      .select('*')
      .eq('id', validated.penaltyId)
      .single();

    if (penaltyError || !penalty) {
      return { success: false, pointsRefunded: 0, error: 'Penalty not found' };
    }

    if (penalty.is_forgiven) {
      return { success: false, pointsRefunded: 0, error: 'Penalty already forgiven' };
    }

    // Check space settings allow forgiveness
    const settings = await getSpacePenaltySettings(penalty.space_id);
    if (!settings.forgiveness_allowed) {
      return { success: false, pointsRefunded: 0, error: 'Forgiveness not allowed in this space' };
    }

    // Refund the points
    const { error: refundError } = await supabase.rpc('increment_points', {
      p_user_id: penalty.user_id,
      p_space_id: penalty.space_id,
      p_amount: penalty.points_deducted,
    });

    // If RPC doesn't exist, do it manually
    if (refundError) {
      const { data: pointsRecord, error: getError } = await supabase
        .from('reward_points')
        .select('points')
        .eq('user_id', penalty.user_id)
        .eq('space_id', penalty.space_id)
        .single();

      if (getError) throw getError;

      await supabase
        .from('reward_points')
        .update({ points: (pointsRecord?.points || 0) + penalty.points_deducted })
        .eq('user_id', penalty.user_id)
        .eq('space_id', penalty.space_id);
    }

    // Record refund transaction
    await supabase
      .from('point_transactions')
      .insert({
        user_id: penalty.user_id,
        space_id: penalty.space_id,
        source_type: 'penalty_forgiven',
        source_id: penalty.chore_id,
        points: penalty.points_deducted,
        reason: `Penalty forgiven${validated.reason ? `: ${validated.reason}` : ''}`,
        metadata: {
          original_penalty_id: penalty.id,
          forgiven_by: validated.forgivenBy,
        },
      });

    // Mark penalty as forgiven
    const { error: updateError } = await supabase
      .from('late_penalties')
      .update({
        is_forgiven: true,
        forgiven_by: validated.forgivenBy,
        forgiven_at: new Date().toISOString(),
        forgiven_reason: validated.reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.penaltyId);

    if (updateError) throw updateError;

    logger.info('Penalty forgiven', {
      penaltyId: validated.penaltyId,
      pointsRefunded: penalty.points_deducted,
      forgivenBy: validated.forgivenBy,
    });

    return { success: true, pointsRefunded: penalty.points_deducted };
  } catch (error) {
    logger.error('Failed to forgive penalty', error instanceof Error ? error : undefined);
    return { success: false, pointsRefunded: 0, error: 'Failed to forgive penalty' };
  }
}

// ============================================================================
// Penalty Queries
// ============================================================================

/**
 * Get penalties for a user in a space
 */
export async function getUserPenalties(
  userId: string,
  spaceId: string,
  options?: {
    limit?: number;
    includeForgiven?: boolean;
  }
): Promise<LatePenalty[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('late_penalties')
      .select('*')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (!options?.includeForgiven) {
      query = query.eq('is_forgiven', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Failed to get user penalties', error instanceof Error ? error : undefined);
    return [];
  }
}

/**
 * Get penalty stats for a space
 */
export async function getPenaltyStats(
  spaceId: string,
  period: 'week' | 'month' | 'all' = 'month'
): Promise<{
  totalPenalties: number;
  totalPointsDeducted: number;
  totalForgiven: number;
  byUser: Array<{ userId: string; penaltyCount: number; pointsDeducted: number }>;
}> {
  try {
    const supabase = await createClient();

    // Calculate date range
    let startDate: string | null = null;
    const now = new Date();

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let query = supabase
      .from('late_penalties')
      .select('*')
      .eq('space_id', spaceId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    const { data: penalties, error } = await query;

    if (error) throw error;

    const allPenalties = (penalties || []) as LatePenalty[];

    // Calculate stats
    const totalPenalties = allPenalties.length;
    const totalPointsDeducted = allPenalties
      .filter((p: LatePenalty) => !p.is_forgiven)
      .reduce((sum: number, p: LatePenalty) => sum + p.points_deducted, 0);
    const totalForgiven = allPenalties.filter((p: LatePenalty) => p.is_forgiven).length;

    // Group by user
    const userMap = new Map<string, { penaltyCount: number; pointsDeducted: number }>();
    for (const penalty of allPenalties) {
      const existing = userMap.get(penalty.user_id) || { penaltyCount: 0, pointsDeducted: 0 };
      userMap.set(penalty.user_id, {
        penaltyCount: existing.penaltyCount + 1,
        pointsDeducted: existing.pointsDeducted + (penalty.is_forgiven ? 0 : penalty.points_deducted),
      });
    }

    const byUser = Array.from(userMap.entries()).map(([userId, stats]) => ({
      userId,
      ...stats,
    }));

    return { totalPenalties, totalPointsDeducted, totalForgiven, byUser };
  } catch (error) {
    logger.error('Failed to get penalty stats', error instanceof Error ? error : undefined);
    return { totalPenalties: 0, totalPointsDeducted: 0, totalForgiven: 0, byUser: [] };
  }
}

/**
 * Get overdue chores that need penalty application
 */
export async function getOverdueChores(
  spaceId: string
): Promise<Array<{ choreId: string; userId: string; daysLate: number; dueDate: string }>> {
  try {
    const supabase = await createClient();
    const settings = await getSpacePenaltySettings(spaceId);

    if (!settings.enabled) {
      return [];
    }

    const { data: chores, error } = await supabase
      .from('chores')
      .select('id, assigned_to, due_date, grace_period_hours')
      .eq('space_id', spaceId)
      .eq('late_penalty_enabled', true)
      .in('status', ['pending', 'in-progress'])
      .not('due_date', 'is', null)
      .not('assigned_to', 'is', null);

    if (error) throw error;

    const now = new Date();
    const overdueChores: Array<{ choreId: string; userId: string; daysLate: number; dueDate: string }> = [];

    for (const chore of chores || []) {
      const gracePeriod = chore.grace_period_hours ?? settings.default_grace_period_hours;
      const daysLate = getDaysOverdue(chore.due_date, gracePeriod);

      if (daysLate > 0 && chore.assigned_to) {
        overdueChores.push({
          choreId: chore.id,
          userId: chore.assigned_to,
          daysLate,
          dueDate: chore.due_date,
        });
      }
    }

    return overdueChores;
  } catch (error) {
    logger.error('Failed to get overdue chores', error instanceof Error ? error : undefined);
    return [];
  }
}
