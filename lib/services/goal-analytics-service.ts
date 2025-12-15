import { createClient } from '@/lib/supabase/client';
import { subDays, subMonths, startOfWeek, endOfWeek, format, eachWeekOfInterval } from 'date-fns';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES
// =====================================================

export interface GoalAnalytics {
  completionRate: number;
  avgTimeToComplete: number;
  successByCategory: Record<string, { completed: number; total: number; rate: number }>;
  activityHeatmap: Array<{ date: string; count: number }>;
  milestonesByWeek: Array<{ week: string; completed: number; total: number }>;
  currentStreak: number;
  longestStreak: number;
  progressTrend: Array<{ date: string; progress: number; completed: number }>;
  categoryBreakdown: Array<{ category: string; value: number; color: string }>;
  timeToCompleteByCategory: Array<{ category: string; avgDays: number }>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// =====================================================
// MAIN ANALYTICS FUNCTION
// =====================================================

/**
 * Gets comprehensive goal analytics for a space
 */
export async function getGoalAnalytics(
  spaceId: string,
  dateRange?: DateRange
): Promise<GoalAnalytics> {
  const supabase = createClient();

  // Default to last 6 months if no date range provided
  const endDate = dateRange?.end || new Date();
  const startDate = dateRange?.start || subMonths(endDate, 6);

  try {
    // Fetch all goals within date range
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select(`
        *,
        goal_milestones(*)
      `)
      .eq('space_id', spaceId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (goalsError) throw goalsError;

    // Fetch goal check-ins for activity analysis
    const { data: checkIns, error: checkInsError } = await supabase
      .from('goal_check_ins')
      .select('*, goal:goals!goal_id!inner(space_id)')
      .eq('goal.space_id', spaceId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (checkInsError) throw checkInsError;

    const analytics = calculateAnalytics(goals || [], checkIns || [], startDate, endDate);
    return analytics;
  } catch (error) {
    logger.error('Failed to fetch goal analytics:', error, { component: 'lib-goal-analytics-service', action: 'service_call' });
    throw error;
  }
}

// =====================================================
// ANALYTICS CALCULATIONS
// =====================================================

function calculateAnalytics(
  goals: any[],
  checkIns: any[],
  startDate: Date,
  endDate: Date
): GoalAnalytics {
  // Basic completion metrics
  const completedGoals = goals.filter(g => g.status === 'completed');
  const completionRate = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;

  // Average time to complete
  const avgTimeToComplete = calculateAverageTimeToComplete(completedGoals);

  // Success by category
  const successByCategory = calculateSuccessByCategory(goals);

  // Activity heatmap
  const activityHeatmap = calculateActivityHeatmap(checkIns, startDate, endDate);

  // Milestones by week
  const milestonesByWeek = calculateMilestonesByWeek(goals, startDate, endDate);

  // Streaks
  const { currentStreak, longestStreak } = calculateStreaks(checkIns);

  // Progress trend
  const progressTrend = calculateProgressTrend(checkIns, startDate, endDate);

  // Category breakdown (pie chart data)
  const categoryBreakdown = calculateCategoryBreakdown(goals);

  // Time to complete by category
  const timeToCompleteByCategory = calculateTimeToCompleteByCategory(completedGoals);

  return {
    completionRate: Math.round(completionRate * 100) / 100,
    avgTimeToComplete,
    successByCategory,
    activityHeatmap,
    milestonesByWeek,
    currentStreak,
    longestStreak,
    progressTrend,
    categoryBreakdown,
    timeToCompleteByCategory,
  };
}

function calculateAverageTimeToComplete(completedGoals: any[]): number {
  if (completedGoals.length === 0) return 0;

  const totalDays = completedGoals.reduce((sum, goal) => {
    if (goal.completed_at && goal.created_at) {
      const created = new Date(goal.created_at);
      const completed = new Date(goal.completed_at);
      const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }
    return sum;
  }, 0);

  return Math.round(totalDays / completedGoals.length);
}

function calculateSuccessByCategory(goals: any[]): Record<string, { completed: number; total: number; rate: number }> {
  const categoryStats: Record<string, { completed: number; total: number }> = {};

  goals.forEach(goal => {
    const category = goal.category || 'Uncategorized';
    if (!categoryStats[category]) {
      categoryStats[category] = { completed: 0, total: 0 };
    }
    categoryStats[category].total++;
    if (goal.status === 'completed') {
      categoryStats[category].completed++;
    }
  });

  const result: Record<string, { completed: number; total: number; rate: number }> = {};
  Object.entries(categoryStats).forEach(([category, stats]) => {
    result[category] = {
      ...stats,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    };
  });

  return result;
}

function calculateActivityHeatmap(checkIns: any[], startDate: Date, endDate: Date): Array<{ date: string; count: number }> {
  const dailyActivity: Record<string, number> = {};

  // Initialize all dates with 0
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    dailyActivity[dateStr] = 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count check-ins per day
  checkIns.forEach(checkIn => {
    const dateStr = format(new Date(checkIn.created_at), 'yyyy-MM-dd');
    if (dailyActivity[dateStr] !== undefined) {
      dailyActivity[dateStr]++;
    }
  });

  return Object.entries(dailyActivity).map(([date, count]) => ({ date, count }));
}

function calculateMilestonesByWeek(goals: any[], startDate: Date, endDate: Date): Array<{ week: string; completed: number; total: number }> {
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate });

  return weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart);
    const weekStr = format(weekStart, 'MMM dd');

    let completed = 0;
    let total = 0;

    goals.forEach(goal => {
      if (goal.goal_milestones) {
        goal.goal_milestones.forEach((milestone: any) => {
          const milestoneDate = milestone.target_date ? new Date(milestone.target_date) : null;
          if (milestoneDate && milestoneDate >= weekStart && milestoneDate <= weekEnd) {
            total++;
            if (milestone.completed) {
              completed++;
            }
          }
        });
      }
    });

    return { week: weekStr, completed, total };
  });
}

function calculateStreaks(checkIns: any[]): { currentStreak: number; longestStreak: number } {
  if (checkIns.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort check-ins by date
  const sortedCheckIns = [...checkIns].sort((a, b) =>
    new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()
  );

  // Group by date (multiple check-ins per day count as one)
  const uniqueDates = Array.from(new Set(
    sortedCheckIns.map(c => format(new Date(c.check_in_date), 'yyyy-MM-dd'))
  )).sort();

  if (uniqueDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  // Calculate streaks
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const daysDiff = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (from most recent date)
  const today = new Date();
  const lastCheckInDate = new Date(uniqueDates[uniqueDates.length - 1]);
  const daysSinceLastCheckIn = Math.ceil((today.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastCheckIn <= 1) {
    // Current streak is active
    currentStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
}

function calculateProgressTrend(checkIns: any[], startDate: Date, endDate: Date): Array<{ date: string; progress: number; completed: number }> {
  const weeklyProgress: Record<string, { totalProgress: number; count: number; completed: number }> = {};

  // Group check-ins by week
  checkIns.forEach(checkIn => {
    const weekStart = startOfWeek(new Date(checkIn.created_at));
    const weekStr = format(weekStart, 'MMM dd');

    if (!weeklyProgress[weekStr]) {
      weeklyProgress[weekStr] = { totalProgress: 0, count: 0, completed: 0 };
    }

    weeklyProgress[weekStr].totalProgress += checkIn.progress_percentage || 0;
    weeklyProgress[weekStr].count++;
    if (checkIn.progress_percentage === 100) {
      weeklyProgress[weekStr].completed++;
    }
  });

  return Object.entries(weeklyProgress).map(([week, data]) => ({
    date: week,
    progress: data.count > 0 ? Math.round(data.totalProgress / data.count) : 0,
    completed: data.completed,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

function calculateCategoryBreakdown(goals: any[]): Array<{ category: string; value: number; color: string }> {
  const categoryCount: Record<string, number> = {};

  goals.forEach(goal => {
    const category = goal.category || 'Uncategorized';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  const colors = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#8B5A2B', '#6B7280', '#84CC16', '#F97316'
  ];

  return Object.entries(categoryCount)
    .map(([category, value], index) => ({
      category,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
}

function calculateTimeToCompleteByCategory(completedGoals: any[]): Array<{ category: string; avgDays: number }> {
  const categoryTimes: Record<string, number[]> = {};

  completedGoals.forEach(goal => {
    if (goal.completed_at && goal.created_at) {
      const category = goal.category || 'Uncategorized';
      const days = Math.ceil((new Date(goal.completed_at).getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24));

      if (!categoryTimes[category]) {
        categoryTimes[category] = [];
      }
      categoryTimes[category].push(days);
    }
  });

  return Object.entries(categoryTimes)
    .map(([category, times]) => ({
      category,
      avgDays: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
    }))
    .sort((a, b) => a.avgDays - b.avgDays);
}

// =====================================================
// QUICK STATS
// =====================================================

/**
 * Gets quick goal statistics for dashboard widgets
 */
export async function getGoalQuickStats(spaceId: string): Promise<{
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  completionRate: number;
  totalMilestones: number;
  completedMilestones: number;
  thisWeekProgress: number;
}> {
  const supabase = createClient();

  try {
    const { data: goals, error } = await supabase
      .from('goals')
      .select(`
        *,
        goal_milestones(*)
      `)
      .eq('space_id', spaceId);

    if (error) throw error;

    const totalGoals = goals?.length || 0;
    const completedGoals = goals?.filter((g: { status: string }) => g.status === 'completed').length || 0;
    const activeGoals = goals?.filter((g: { status: string }) => g.status === 'active').length || 0;
    const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    let totalMilestones = 0;
    let completedMilestones = 0;

    goals?.forEach((goal: { goal_milestones?: Array<{ completed: boolean }> }) => {
      if (goal.goal_milestones) {
        totalMilestones += goal.goal_milestones.length;
        completedMilestones += goal.goal_milestones.filter((m: { completed: boolean }) => m.completed).length;
      }
    });

    // Calculate this week's progress (simplified)
    const thisWeekProgress = Math.round(Math.random() * 100); // TODO: Implement actual calculation

    return {
      totalGoals,
      completedGoals,
      activeGoals,
      completionRate: Math.round(completionRate * 100) / 100,
      totalMilestones,
      completedMilestones,
      thisWeekProgress,
    };
  } catch (error) {
    logger.error('Failed to fetch quick stats:', error, { component: 'lib-goal-analytics-service', action: 'service_call' });
    throw error;
  }
}