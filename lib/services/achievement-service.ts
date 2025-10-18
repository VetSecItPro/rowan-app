import { createClient } from '@/lib/supabase/client';
import type { BadgeProgress } from '@/lib/types';

const supabase = createClient();

// Adapted types to work with existing schema
export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria: BadgeRequirement;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  space_id: string;
  badge_id: string;
  earned_at: string;
  progress?: BadgeProgress;
  badge?: AchievementBadge;
}

export type BadgeRequirement =
  | { type: 'goals_completed'; count: number }
  | { type: 'milestones_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'weekly_checkins'; count: number }
  | { type: 'shared_goals_completed'; count: number }
  | { type: 'goal_duration_days'; min: number }
  | { type: 'categories_completed'; count: number }
  | { type: 'goal_completed_hours'; max: number }
  | { type: 'fast_goals_completed'; count: number; max_days: number }
  | { type: 'first_goal_days'; max: number }
  | { type: 'perfect_goal_completed'; count: number };

// =============================================
// GET FUNCTIONS
// =============================================

/**
 * Get all achievement badge definitions
 */
export async function getAllBadges(): Promise<AchievementBadge[]> {
  try {
    const { data, error } = await supabase
      .from('achievement_badges')
      .select('*')
      .order('rarity', { ascending: true })
      .order('points', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching badges:', error);
    return [];
  }
}

/**
 * Get all badges earned by a user in a space
 */
export async function getUserBadges(
  userId: string,
  spaceId: string
): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        badge:achievement_badges(*)
      `)
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .order('earned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

/**
 * Get badge progress for all badges not yet earned
 */
export async function getBadgeProgress(
  userId: string,
  spaceId: string
): Promise<Array<AchievementBadge & { progress: BadgeProgress }>> {
  try {
    // Get all badges
    const allBadges = await getAllBadges();

    // Get earned badges
    const earnedBadges = await getUserBadges(userId, spaceId);
    const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge_id));

    // Filter to unearn badges and calculate progress
    const progressPromises = allBadges
      .filter((badge) => !earnedBadgeIds.has(badge.id))
      .map(async (badge) => {
        const progress = await calculateBadgeProgressForBadge(
          userId,
          spaceId,
          badge
        );
        return { ...badge, progress };
      });

    const results = await Promise.all(progressPromises);

    // Sort by completion percentage (descending)
    return results.sort((a, b) => b.progress.percentage - a.progress.percentage);
  } catch (error) {
    console.error('Error fetching badge progress:', error);
    return [];
  }
}

// =============================================
// BADGE PROGRESS CALCULATION
// =============================================

/**
 * Calculate progress for a specific badge
 */
async function calculateBadgeProgressForBadge(
  userId: string,
  spaceId: string,
  badge: AchievementBadge
): Promise<BadgeProgress> {
  const requirement = badge.criteria;

  switch (requirement.type) {
    case 'goals_completed':
      return await calculateGoalsCompletedProgress(userId, spaceId, requirement.count);

    case 'milestones_completed':
      return await calculateMilestonesCompletedProgress(userId, spaceId, requirement.count);

    case 'streak_days':
      return await calculateStreakDaysProgress(userId, spaceId, requirement.count);

    case 'weekly_checkins':
      return await calculateWeeklyCheckinsProgress(userId, spaceId, requirement.count);

    case 'shared_goals_completed':
      return await calculateSharedGoalsProgress(userId, spaceId, requirement.count);

    case 'goal_duration_days':
      return await calculateDurationProgress(userId, spaceId, requirement.min);

    case 'categories_completed':
      return await calculateCategoriesProgress(userId, spaceId, requirement.count);

    case 'goal_completed_hours':
      return await calculateQuickWinProgress(userId, spaceId, requirement.max);

    case 'fast_goals_completed':
      return await calculateFastGoalsProgress(
        userId,
        spaceId,
        requirement.count,
        requirement.max_days
      );

    case 'first_goal_days':
      return await calculateFirstGoalProgress(userId, spaceId, requirement.max);

    case 'perfect_goal_completed':
      return await calculatePerfectGoalProgress(userId, spaceId, requirement.count);

    default:
      return { current: 0, target: 1, percentage: 0 };
  }
}

// Progress calculation helpers
async function calculateGoalsCompletedProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  const { count } = await supabase
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed');

  const current = count || 0;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateMilestonesCompletedProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('space_id', spaceId)
    .eq('created_by', userId);

  if (!goals || goals.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  const goalIds = goals.map((g) => g.id);
  const { count } = await supabase
    .from('goal_milestones')
    .select('*', { count: 'exact', head: true })
    .in('goal_id', goalIds)
    .eq('completed', true);

  const current = count || 0;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateStreakDaysProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  // Get recent goal updates ordered by date
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('space_id', spaceId)
    .eq('created_by', userId);

  if (!goals || goals.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  const goalIds = goals.map((g) => g.id);
  const { data: updates } = await supabase
    .from('goal_updates')
    .select('created_at')
    .in('goal_id', goalIds)
    .order('created_at', { ascending: false });

  if (!updates || updates.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  // Calculate current streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updateDates = updates.map((u) => {
    const d = new Date(u.created_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const uniqueDates = [...new Set(updateDates)].sort((a, b) => b - a);

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);

    if (uniqueDates[i] === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  const current = streak;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateWeeklyCheckinsProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  // Get goal updates from the past weeks
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('space_id', spaceId)
    .eq('created_by', userId);

  if (!goals || goals.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  const goalIds = goals.map((g) => g.id);
  const { data: updates } = await supabase
    .from('goal_updates')
    .select('created_at')
    .in('goal_id', goalIds)
    .order('created_at', { ascending: false });

  if (!updates || updates.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  // Group updates by week
  const weeks = new Set<string>();
  updates.forEach((u) => {
    const date = new Date(u.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    weeks.add(weekStart.toISOString());
  });

  const current = weeks.size;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateSharedGoalsProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  const { count } = await supabase
    .from('goals')
    .select('*', { count: 'exact', head: true })
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .eq('is_shared', true);

  const current = count || 0;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateDurationProgress(
  userId: string,
  spaceId: string,
  minDays: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('created_at, completed_at')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);

  if (!goals || goals.length === 0) {
    return { current: 0, target: 1, percentage: 0 };
  }

  const hasLongGoal = goals.some((goal) => {
    const created = new Date(goal.created_at);
    const completed = new Date(goal.completed_at!);
    const durationDays = Math.floor(
      (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return durationDays >= minDays;
  });

  return {
    current: hasLongGoal ? 1 : 0,
    target: 1,
    percentage: hasLongGoal ? 100 : 0,
  };
}

async function calculateCategoriesProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('category')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .not('category', 'is', null);

  if (!goals || goals.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  const categories = new Set(goals.map((g) => g.category));
  const current = categories.size;

  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

async function calculateQuickWinProgress(
  userId: string,
  spaceId: string,
  maxHours: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('created_at, completed_at')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);

  if (!goals || goals.length === 0) {
    return { current: 0, target: 1, percentage: 0 };
  }

  const hasQuickWin = goals.some((goal) => {
    const created = new Date(goal.created_at);
    const completed = new Date(goal.completed_at!);
    const durationHours =
      (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
    return durationHours <= maxHours;
  });

  return {
    current: hasQuickWin ? 1 : 0,
    target: 1,
    percentage: hasQuickWin ? 100 : 0,
  };
}

async function calculateFastGoalsProgress(
  userId: string,
  spaceId: string,
  targetCount: number,
  maxDays: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('created_at, completed_at')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null);

  if (!goals || goals.length === 0) {
    return { current: 0, target: targetCount, percentage: 0 };
  }

  const fastGoals = goals.filter((goal) => {
    const created = new Date(goal.created_at);
    const completed = new Date(goal.completed_at!);
    const durationDays = Math.floor(
      (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
    return durationDays <= maxDays;
  });

  const current = fastGoals.length;
  return {
    current,
    target: targetCount,
    percentage: Math.min((current / targetCount) * 100, 100),
  };
}

async function calculateFirstGoalProgress(
  userId: string,
  spaceId: string,
  maxDays: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('created_at, completed_at')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true })
    .limit(1);

  if (!goals || goals.length === 0) {
    return { current: 0, target: 1, percentage: 0 };
  }

  const firstGoal = goals[0];
  const created = new Date(firstGoal.created_at);
  const completed = new Date(firstGoal.completed_at!);
  const durationDays = Math.floor(
    (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );

  const achieved = durationDays <= maxDays;
  return {
    current: achieved ? 1 : 0,
    target: 1,
    percentage: achieved ? 100 : 0,
  };
}

async function calculatePerfectGoalProgress(
  userId: string,
  spaceId: string,
  target: number
): Promise<BadgeProgress> {
  const { data: goals } = await supabase
    .from('goals')
    .select('id')
    .eq('space_id', spaceId)
    .eq('created_by', userId)
    .eq('status', 'completed');

  if (!goals || goals.length === 0) {
    return { current: 0, target, percentage: 0 };
  }

  // Check each goal for all milestones completed
  const perfectGoals: string[] = [];

  for (const goal of goals) {
    const { data: milestones } = await supabase
      .from('goal_milestones')
      .select('completed')
      .eq('goal_id', goal.id);

    if (milestones && milestones.length > 0) {
      const allCompleted = milestones.every((m) => m.completed);
      if (allCompleted) {
        perfectGoals.push(goal.id);
      }
    }
  }

  const current = perfectGoals.length;
  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
  };
}

// =============================================
// BADGE AWARDING
// =============================================

/**
 * Check all badges and award any newly earned ones
 * Returns array of newly awarded badges
 */
export async function checkAndAwardBadges(
  userId: string,
  spaceId: string
): Promise<UserBadge[]> {
  try {
    const allBadges = await getAllBadges();
    const earnedBadges = await getUserBadges(userId, spaceId);
    const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge_id));

    const newlyEarned: UserBadge[] = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      // Calculate progress
      const progress = await calculateBadgeProgressForBadge(userId, spaceId, badge);

      // Award if requirement met
      if (progress.percentage >= 100) {
        const awarded = await awardBadge(userId, spaceId, badge.id);
        if (awarded) {
          newlyEarned.push({ ...awarded, badge });
        }
      }
    }

    return newlyEarned;
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
    return [];
  }
}

/**
 * Award a specific badge to a user
 */
export async function awardBadge(
  userId: string,
  spaceId: string,
  badgeId: string
): Promise<UserBadge | null> {
  try {
    const { data, error} = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        space_id: spaceId,
        badge_id: badgeId,
        earned_at: new Date().toISOString(),
      })
      .select(`
        *,
        badge:achievement_badges(*)
      `)
      .single();

    if (error) {
      // Ignore duplicate errors (badge already earned)
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return null;
  }
}

/**
 * Get total badge points for a user in a space
 */
export async function getUserBadgeStats(
  userId: string,
  spaceId: string
): Promise<{
  totalBadges: number;
  totalPoints: number;
  byRarity: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  try {
    const userBadges = await getUserBadges(userId, spaceId);

    const stats = {
      totalBadges: userBadges.length,
      totalPoints: 0,
      byRarity: { common: 0, rare: 0, epic: 0, legendary: 0 },
      byCategory: {
        milestone: 0,
        streak: 0,
        collaboration: 0,
        persistence: 0,
        variety: 0,
        speed: 0,
      },
    };

    userBadges.forEach((userBadge) => {
      if (userBadge.badge) {
        stats.totalPoints += userBadge.badge.points;
        stats.byRarity[userBadge.badge.rarity] =
          (stats.byRarity[userBadge.badge.rarity] || 0) + 1;
        stats.byCategory[userBadge.badge.category] =
          (stats.byCategory[userBadge.badge.category] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error fetching badge stats:', error);
    return {
      totalBadges: 0,
      totalPoints: 0,
      byRarity: { common: 0, rare: 0, epic: 0, legendary: 0 },
      byCategory: {
        milestone: 0,
        streak: 0,
        collaboration: 0,
        persistence: 0,
        variety: 0,
        speed: 0,
      },
    };
  }
}
