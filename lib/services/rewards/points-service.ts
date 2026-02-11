// Phase 14: Chore Rewards - Points Service
// Handles all point-related operations: awarding, spending, tracking, levels

import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type {
  RewardPoints,
  PointTransaction,
  CreatePointTransactionInput,
  UserRewardsStats,
  LeaderboardEntry,
} from '@/lib/types/rewards';
import {
  LEVEL_DEFINITIONS as LEVELS,
  POINTS_CONFIG as CONFIG,
} from '@/lib/types/rewards';

/**
 * Points Service
 * Manages reward points, transactions, and gamification features
 */
export const pointsService = {
  // =============================================================================
  // POINTS BALANCE OPERATIONS
  // =============================================================================

  /**
   * Get or create a user's reward points record
   */
  async getOrCreatePointsRecord(userId: string, spaceId: string): Promise<RewardPoints> {
    const supabase = createClient();

    // Try to get existing record (use maybeSingle to avoid 406 error when no rows)
    const { data: existing, error: fetchError } = await supabase
      .from('reward_points')
      .select('id, user_id, space_id, points, level, current_streak, longest_streak, last_activity_at, created_at, updated_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Log fetch error if it's not just "no rows"
    if (fetchError) {
      logger.warn('Error fetching points record: ' + fetchError.message, { component: 'points-service', action: 'service_call' });
    }

    // Create new record if not exists
    const { data: created, error: createError } = await supabase
      .from('reward_points')
      .insert({
        user_id: userId,
        space_id: spaceId,
        points: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create points record: ${createError.message}`);
    }

    return created;
  },

  /**
   * Get points balance for a user in a space
   */
  async getPointsBalance(userId: string, spaceId: string): Promise<number> {
    const record = await this.getOrCreatePointsRecord(userId, spaceId);
    return record.points;
  },

  /**
   * Get full user stats including points, level, streaks
   */
  async getUserStats(userId: string, spaceId: string): Promise<UserRewardsStats> {
    const supabase = createClient();

    // Get base record
    const record = await this.getOrCreatePointsRecord(userId, spaceId);

    // Get points earned this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: weekTransactions } = await supabase
      .from('point_transactions')
      .select('points')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .gt('points', 0) // Only credits
      .gte('created_at', weekStart.toISOString());

    const pointsThisWeek = (weekTransactions || []).reduce((sum: number, t: { points: number }) => sum + t.points, 0);

    // Get points earned this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthTransactions } = await supabase
      .from('point_transactions')
      .select('points')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .gt('points', 0)
      .gte('created_at', monthStart.toISOString());

    const pointsThisMonth = (monthTransactions || []).reduce((sum: number, t: { points: number }) => sum + t.points, 0);

    // Get chores completed today/this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayChores } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('source_type', 'chore')
      .gte('created_at', today.toISOString());

    const { data: weekChores } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('source_type', 'chore')
      .gte('created_at', weekStart.toISOString());

    // Get pending redemptions count
    const { count: pendingCount } = await supabase
      .from('reward_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('status', 'pending');

    // Calculate level progress
    const currentLevel = this.calculateLevel(record.points);
    const nextLevelDef = LEVELS.find(l => l.level === currentLevel.level + 1);
    const nextLevelPoints = nextLevelDef?.min_points || currentLevel.min_points;
    const pointsIntoLevel = record.points - currentLevel.min_points;
    const pointsNeededForNext = nextLevelPoints - currentLevel.min_points;
    const progressToNextLevel = nextLevelDef
      ? Math.min(100, Math.round((pointsIntoLevel / pointsNeededForNext) * 100))
      : 100;

    return {
      total_points: record.points,
      level: record.level,
      current_streak: record.current_streak,
      longest_streak: record.longest_streak,
      points_this_week: pointsThisWeek,
      points_this_month: pointsThisMonth,
      chores_completed_today: todayChores?.length || 0,
      chores_completed_this_week: weekChores?.length || 0,
      pending_redemptions: pendingCount || 0,
      next_level_points: nextLevelPoints,
      progress_to_next_level: progressToNextLevel,
    };
  },

  // =============================================================================
  // AWARDING POINTS
  // =============================================================================

  /**
   * Award points to a user (creates transaction and updates balance)
   */
  async awardPoints(input: CreatePointTransactionInput): Promise<PointTransaction> {
    const supabase = createClient();

    // Ensure points record exists
    const record = await this.getOrCreatePointsRecord(input.user_id, input.space_id);

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: input.user_id,
        space_id: input.space_id,
        source_type: input.source_type,
        source_id: input.source_id || null,
        points: input.points,
        reason: input.reason,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }

    // Update balance
    const newPoints = record.points + input.points;
    const newLevel = this.calculateLevel(newPoints).level;

    const { error: updateError } = await supabase
      .from('reward_points')
      .update({
        points: newPoints,
        level: newLevel,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      logger.error('Failed to update points balance:', updateError, { component: 'lib-points-service', action: 'service_call' });
    }

    return transaction;
  },

  /**
   * Award points for completing a chore
   */
  async awardChorePoints(
    userId: string,
    spaceId: string,
    choreId: string,
    choreTitle: string,
    basePoints: number = CONFIG.CHORE_COMPLETE
  ): Promise<{ transaction: PointTransaction; streakBonus: number; newStreak: number }> {
    const supabase = createClient();

    // Get current record to check streak
    const record = await this.getOrCreatePointsRecord(userId, spaceId);

    // Check if user has activity yesterday (for streak)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: yesterdayActivity } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('source_type', 'chore')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())
      .limit(1);

    // Calculate new streak
    let newStreak = record.current_streak;
    const hadActivityYesterday = yesterdayActivity && yesterdayActivity.length > 0;

    // Check if already has activity today (don't increment streak again)
    const { data: todayActivity } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('source_type', 'chore')
      .gte('created_at', today.toISOString())
      .limit(1);

    const alreadyActiveToday = todayActivity && todayActivity.length > 0;

    if (!alreadyActiveToday) {
      if (hadActivityYesterday) {
        newStreak = record.current_streak + 1;
      } else {
        newStreak = 1; // Reset streak
      }
    }

    // Calculate streak bonus
    const streakBonus = Math.min(
      (newStreak - 1) * CONFIG.STREAK_BONUS_PER_DAY,
      CONFIG.MAX_STREAK_BONUS
    );

    const totalPoints = basePoints + streakBonus;

    // Award main points
    const transaction = await this.awardPoints({
      user_id: userId,
      space_id: spaceId,
      source_type: 'chore',
      source_id: choreId,
      points: totalPoints,
      reason: `Completed: ${choreTitle}${streakBonus > 0 ? ` (+${streakBonus} streak bonus)` : ''}`,
      metadata: {
        chore_title: choreTitle,
        base_points: basePoints,
        streak_bonus: streakBonus,
        streak_day: newStreak,
      },
    });

    // Update streak
    const newLongestStreak = Math.max(record.longest_streak, newStreak);
    await supabase
      .from('reward_points')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
      })
      .eq('id', record.id);

    return { transaction, streakBonus, newStreak };
  },

  /**
   * Award points for completing a task
   */
  async awardTaskPoints(
    userId: string,
    spaceId: string,
    taskId: string,
    taskTitle: string
  ): Promise<PointTransaction> {
    return this.awardPoints({
      user_id: userId,
      space_id: spaceId,
      source_type: 'task',
      source_id: taskId,
      points: CONFIG.TASK_COMPLETE,
      reason: `Completed task: ${taskTitle}`,
      metadata: { task_title: taskTitle },
    });
  },

  // =============================================================================
  // SPENDING POINTS (REDEMPTIONS)
  // =============================================================================

  /**
   * Deduct points for a redemption
   */
  async spendPoints(
    userId: string,
    spaceId: string,
    redemptionId: string,
    points: number,
    rewardName: string
  ): Promise<PointTransaction> {
    const record = await this.getOrCreatePointsRecord(userId, spaceId);

    if (record.points < points) {
      throw new Error('Insufficient points');
    }

    return this.awardPoints({
      user_id: userId,
      space_id: spaceId,
      source_type: 'redemption',
      source_id: redemptionId,
      points: -points, // Negative for deduction
      reason: `Redeemed: ${rewardName}`,
      metadata: { reward_name: rewardName },
    });
  },

  // =============================================================================
  // TRANSACTION HISTORY
  // =============================================================================

  /**
   * Get point transaction history
   */
  async getPointsHistory(
    userId: string,
    spaceId: string,
    limit: number = 20
  ): Promise<PointTransaction[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('point_transactions')
      .select('id, user_id, space_id, source_type, source_id, points, reason, metadata, created_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data || [];
  },

  // =============================================================================
  // LEADERBOARD
  // =============================================================================

  /**
   * Get family leaderboard for a space
   */
  async getLeaderboard(
    spaceId: string,
    period: 'week' | 'month' | 'all' = 'week'
  ): Promise<LeaderboardEntry[]> {
    const supabase = createClient();

    // Get all space members with their points
    const { data: members, error: membersError } = await supabase
      .from('space_members')
      .select(`
        user_id,
        users!inner(id, name, avatar_url)
      `)
      .eq('space_id', spaceId);

    if (membersError || !members) {
      throw new Error(`Failed to fetch members: ${membersError?.message}`);
    }

    // Get period start date
    let periodStart = new Date();
    if (period === 'week') {
      periodStart.setDate(periodStart.getDate() - periodStart.getDay());
    } else if (period === 'month') {
      periodStart.setDate(1);
    } else {
      periodStart = new Date(0); // All time
    }
    periodStart.setHours(0, 0, 0, 0);

    // Build leaderboard entries
    const entries: LeaderboardEntry[] = [];

    for (const member of members) {
      const user = member.users as { id: string; name: string; avatar_url: string | null };

      // Get points record (use maybeSingle to handle users without records)
      const { data: pointsRecord } = await supabase
        .from('reward_points')
        .select('id, user_id, space_id, points, level, current_streak, longest_streak, last_activity_at, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .maybeSingle();

      // Get period transactions
      const { data: periodTx } = await supabase
        .from('point_transactions')
        .select('points, source_type')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .gt('points', 0)
        .gte('created_at', periodStart.toISOString());

      const pointsThisPeriod = (periodTx || []).reduce((sum: number, t: { points: number }) => sum + t.points, 0);
      const choresThisPeriod = (periodTx || []).filter((t: { source_type: string }) => t.source_type === 'chore').length;

      // Get month transactions for monthly view
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthTx } = await supabase
        .from('point_transactions')
        .select('points')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .gt('points', 0)
        .gte('created_at', monthStart.toISOString());

      const pointsThisMonth = (monthTx || []).reduce((sum: number, t: { points: number }) => sum + t.points, 0);

      entries.push({
        user_id: user.id,
        name: user.name || 'Unknown',
        avatar_url: user.avatar_url,
        points: pointsRecord?.points || 0,
        level: pointsRecord?.level || 1,
        current_streak: pointsRecord?.current_streak || 0,
        points_this_week: period === 'week' ? pointsThisPeriod : 0,
        points_this_month: pointsThisMonth,
        chores_completed_this_week: choresThisPeriod,
        rank: 0, // Will be set after sorting
      });
    }

    // Sort by period points and assign ranks
    entries.sort((a, b) => {
      const aPoints = period === 'week' ? a.points_this_week : period === 'month' ? a.points_this_month : a.points;
      const bPoints = period === 'week' ? b.points_this_week : period === 'month' ? b.points_this_month : b.points;
      return bPoints - aPoints;
    });

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  },

  // =============================================================================
  // LEVEL CALCULATIONS
  // =============================================================================

  /**
   * Calculate level based on total points
   */
  calculateLevel(totalPoints: number): typeof LEVELS[number] {
    let result = LEVELS[0];
    for (const level of LEVELS) {
      if (totalPoints >= level.min_points) {
        result = level;
      } else {
        break;
      }
    }
    return result;
  },

  /**
   * Check if a streak milestone was reached
   */
  isStreakMilestone(streak: number): boolean {
    return (CONFIG.STREAK_MILESTONES as readonly number[]).includes(streak);
  },
};
