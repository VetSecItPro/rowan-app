/**
 * Year in Review Service
 *
 * Aggregates annual statistics and generates comprehensive yearly summaries
 * for users including tasks, goals, expenses, achievements, and insights.
 *
 * PERF-DB-004: Refactored from ~100 per-month/per-metric queries down to
 * 3 bulk fetches (tasks, goals, expenses) with pure in-memory aggregation.
 */

import { createClient } from '@/lib/supabase/server';
import { startOfYear, endOfYear, format, eachMonthOfInterval, getDay } from 'date-fns';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface YearInReviewData {
  year: number;
  overview: OverviewStats;
  monthlyBreakdown: MonthlyStats[];
  achievements: AchievementSummary;
  insights: PersonalInsights;
  topCategories: CategoryStats[];
  goals: GoalsSummary;
  expenses: ExpensesSummary;
  productivity: ProductivityMetrics;
}

export interface OverviewStats {
  tasksCompleted: number;
  goalsAchieved: number;
  totalExpenses: number;
  badgesEarned: number;
  activeDays: number;
  totalSavings: number;
  averageTasksPerDay: number;
  goalCompletionRate: number;
}

export interface MonthlyStats {
  month: string;
  monthName: string;
  tasksCompleted: number;
  goalsAchieved: number;
  expensesAmount: number;
  badgesEarned: number;
  activeDays: number;
}

export interface AchievementSummary {
  badgesEarned: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    earnedAt: string;
    icon: string;
  }>;
  milestones: Array<{
    title: string;
    description: string;
    achievedAt: string;
    value: number;
    type: 'tasks' | 'goals' | 'expenses' | 'streak';
  }>;
  personalRecords: Array<{
    title: string;
    value: number;
    unit: string;
    description: string;
  }>;
}

export interface PersonalInsights {
  mostProductiveMonth: string;
  favoriteTaskCategory: string;
  averageGoalCompletionTime: number;
  topSpendingCategory: string;
  longestStreak: number;
  totalTimeWorked: number;
  improvementAreas: string[];
  strengths: string[];
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
  totalValue?: number;
}

export interface GoalsSummary {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  completionRate: number;
  averageCompletionTime: number;
  topGoalCategories: CategoryStats[];
  monthlyGoalTrends: Array<{
    month: string;
    created: number;
    completed: number;
  }>;
}

export interface ExpensesSummary {
  totalAmount: number;
  totalTransactions: number;
  averagePerMonth: number;
  topCategories: CategoryStats[];
  monthlyTrends: Array<{
    month: string;
    amount: number;
    transactions: number;
  }>;
  savingsVsBudget: number;
}

export interface ProductivityMetrics {
  averageTasksPerDay: number;
  mostProductiveDay: string;
  mostProductiveHour: number;
  weekdayVsWeekend: {
    weekday: number;
    weekend: number;
  };
  monthlyProductivity: Array<{
    month: string;
    score: number;
  }>;
}

// =====================================================
// INTERNAL ROW TYPES (only columns we SELECT)
// =====================================================

interface TaskRow {
  id: string;
  status: string;
  category: string | null;
  created_at: string;
  completed_at: string | null;
}

interface GoalRow {
  id: string;
  status: string;
  category: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ExpenseRow {
  id: string;
  amount: number;
  category: string | null;
  created_at: string;
}

// Day-of-week names indexed by getDay() (0 = Sunday)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// =====================================================
// YEAR IN REVIEW SERVICE
// =====================================================

/** Generates comprehensive year-in-review statistics across tasks, goals, budgets, and more. */
export class YearInReviewService {
  /**
   * Generate comprehensive year in review for a user and space.
   *
   * Fetches 3 bulk datasets (tasks, goals, expenses) in parallel,
   * then derives all stats purely in memory — zero additional DB queries.
   */
  async generateYearInReview(
    supabase: Awaited<ReturnType<typeof createClient>>,
    _userId: string,
    spaceId: string,
    year: number = new Date().getFullYear()
  ): Promise<YearInReviewData> {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // ── 3 bulk fetches (the ONLY DB queries) ──
    const [tasks, goals, expenses] = await Promise.all([
      this.fetchTasks(supabase, spaceId, yearStart, yearEnd),
      this.fetchGoals(supabase, spaceId, yearStart, yearEnd),
      this.fetchExpenses(supabase, spaceId, yearStart, yearEnd),
    ]);

    // ── Pure in-memory derivation ──
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at);
    const completedGoals = goals.filter(g => g.status === 'completed' && g.completed_at);
    const monthlyBreakdown = this.deriveMonthlyBreakdown(year, completedTasks, completedGoals, expenses, tasks);

    return {
      year,
      overview: this.deriveOverview(tasks, completedTasks, goals, completedGoals, expenses, yearStart, yearEnd),
      monthlyBreakdown,
      achievements: this.deriveAchievements(completedTasks.length, completedGoals.length, yearStart),
      insights: this.deriveInsights(monthlyBreakdown, tasks, expenses),
      topCategories: this.deriveTopCategories(tasks),
      goals: this.deriveGoalsSummary(goals, completedGoals, year),
      expenses: this.deriveExpensesSummary(expenses, year),
      productivity: this.deriveProductivity(completedTasks, yearStart, yearEnd, year),
    };
  }

  // =====================================================
  // DATA FETCHING (3 queries total)
  // =====================================================

  private async fetchTasks(
    supabase: Awaited<ReturnType<typeof createClient>>,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date,
  ): Promise<TaskRow[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, status, category, created_at, completed_at')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    if (error) throw error;
    return data || [];
  }

  private async fetchGoals(
    supabase: Awaited<ReturnType<typeof createClient>>,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date,
  ): Promise<GoalRow[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('id, status, category, created_at, completed_at')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    if (error) throw error;
    return data || [];
  }

  private async fetchExpenses(
    supabase: Awaited<ReturnType<typeof createClient>>,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date,
  ): Promise<ExpenseRow[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, amount, category, created_at')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    if (error) throw error;
    return data || [];
  }

  // =====================================================
  // PURE DERIVATION FUNCTIONS (zero DB queries)
  // =====================================================

  private deriveOverview(
    allTasks: TaskRow[],
    completedTasks: TaskRow[],
    allGoals: GoalRow[],
    completedGoals: GoalRow[],
    expenses: ExpenseRow[],
    yearStart: Date,
    yearEnd: Date,
  ): OverviewStats {
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const uniqueActiveDays = new Set(
      allTasks.map(t => format(new Date(t.created_at), 'yyyy-MM-dd'))
    );
    const daysInYear = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      tasksCompleted: completedTasks.length,
      goalsAchieved: completedGoals.length,
      totalExpenses,
      badgesEarned: Math.floor(completedTasks.length / 10),
      activeDays: uniqueActiveDays.size,
      totalSavings: 0,
      averageTasksPerDay: completedTasks.length / daysInYear,
      goalCompletionRate: allGoals.length
        ? (completedGoals.length / allGoals.length) * 100
        : 0,
    };
  }

  private deriveMonthlyBreakdown(
    year: number,
    completedTasks: TaskRow[],
    completedGoals: GoalRow[],
    expenses: ExpenseRow[],
    allTasks: TaskRow[],
  ): MonthlyStats[] {
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    });

    // Pre-bucket items by month key for O(n) aggregation
    const tasksByMonth = this.bucketByMonth(completedTasks, r => r.completed_at!);
    const goalsByMonth = this.bucketByMonth(completedGoals, r => r.completed_at!);
    const expensesByMonth = this.bucketByMonth(expenses, r => r.created_at);
    const allTasksByMonth = this.bucketByMonth(allTasks, r => r.created_at);

    return months.map(month => {
      const key = format(month, 'yyyy-MM');
      const monthTasks = tasksByMonth.get(key) || [];
      const monthGoals = goalsByMonth.get(key) || [];
      const monthExpenses = expensesByMonth.get(key) || [];
      const monthAllTasks = allTasksByMonth.get(key) || [];

      const uniqueDays = new Set(
        monthAllTasks.map(t => format(new Date(t.created_at), 'yyyy-MM-dd'))
      );

      return {
        month: key,
        monthName: format(month, 'MMMM'),
        tasksCompleted: monthTasks.length,
        goalsAchieved: monthGoals.length,
        expensesAmount: monthExpenses.reduce((sum, e) => sum + Number((e as ExpenseRow).amount), 0),
        badgesEarned: Math.floor(monthTasks.length / 5),
        activeDays: uniqueDays.size,
      };
    });
  }

  private deriveAchievements(
    tasksCompleted: number,
    goalsAchieved: number,
    yearStart: Date,
  ): AchievementSummary {
    const badgesEarned: AchievementSummary['badgesEarned'] = [];

    if (tasksCompleted >= 100) {
      badgesEarned.push({
        id: 'task-master-100',
        type: 'achievement',
        title: 'Task Master',
        description: 'Completed 100+ tasks this year',
        earnedAt: new Date().toISOString(),
        icon: '🏆',
      });
    }
    if (goalsAchieved >= 10) {
      badgesEarned.push({
        id: 'goal-crusher-10',
        type: 'achievement',
        title: 'Goal Crusher',
        description: 'Achieved 10+ goals this year',
        earnedAt: new Date().toISOString(),
        icon: '🎯',
      });
    }

    const milestones = [
      { title: 'First Goal Completed', description: 'Completed your first goal of the year', achievedAt: yearStart.toISOString(), value: 1, type: 'goals' as const },
      { title: 'Century Club', description: 'Completed 100 tasks', achievedAt: new Date().toISOString(), value: 100, type: 'tasks' as const },
    ].filter(m => {
      if (m.type === 'tasks') return tasksCompleted >= m.value;
      if (m.type === 'goals') return goalsAchieved >= m.value;
      return false;
    });

    return {
      badgesEarned,
      milestones,
      personalRecords: [
        { title: 'Tasks Completed', value: tasksCompleted, unit: 'tasks', description: 'Total tasks completed this year' },
        { title: 'Goals Achieved', value: goalsAchieved, unit: 'goals', description: 'Total goals achieved this year' },
      ],
    };
  }

  private deriveInsights(
    monthlyBreakdown: MonthlyStats[],
    tasks: TaskRow[],
    expenses: ExpenseRow[],
  ): PersonalInsights {
    // Most productive month
    const mostProductiveMonth = monthlyBreakdown.reduce((max, m) =>
      m.tasksCompleted > max.tasksCompleted ? m : max
    ).monthName;

    // Favorite task category
    const categoryCounts: Record<string, number> = {};
    for (const t of tasks) {
      const cat = t.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const favoriteTaskCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

    // Top spending category
    const expenseCategorySums: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category || 'other';
      expenseCategorySums[cat] = (expenseCategorySums[cat] || 0) + Number(e.amount);
    }
    const topSpendingCategory = Object.entries(expenseCategorySums)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    return {
      mostProductiveMonth,
      favoriteTaskCategory,
      averageGoalCompletionTime: 30,
      topSpendingCategory,
      longestStreak: 7,
      totalTimeWorked: 2400,
      improvementAreas: ['time management', 'goal setting'],
      strengths: ['task completion', 'consistency'],
    };
  }

  private deriveTopCategories(tasks: TaskRow[]): CategoryStats[] {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const cat = t.category || 'general';
      counts[cat] = (counts[cat] || 0) + 1;
    }

    const total = tasks.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }));
  }

  private deriveGoalsSummary(
    allGoals: GoalRow[],
    completedGoals: GoalRow[],
    year: number,
  ): GoalsSummary {
    // Category stats
    const categoryCounts: Record<string, number> = {};
    for (const g of allGoals) {
      const cat = g.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const totalForPct = allGoals.length || 1;
    const topGoalCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, percentage: Math.round((count / totalForPct) * 100) }));

    // Monthly trends
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    });
    const createdByMonth = this.bucketByMonth(allGoals, g => g.created_at);
    const completedByMonth = this.bucketByMonth(completedGoals, g => g.completed_at!);
    const monthlyGoalTrends = months.map(m => {
      const key = format(m, 'yyyy-MM');
      return { month: key, created: createdByMonth.get(key)?.length || 0, completed: completedByMonth.get(key)?.length || 0 };
    });

    return {
      totalGoals: allGoals.length,
      completedGoals: completedGoals.length,
      inProgressGoals: allGoals.length - completedGoals.length,
      completionRate: allGoals.length ? (completedGoals.length / allGoals.length) * 100 : 0,
      averageCompletionTime: 30,
      topGoalCategories,
      monthlyGoalTrends,
    };
  }

  private deriveExpensesSummary(expenses: ExpenseRow[], year: number): ExpensesSummary {
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Category stats
    const catSums: Record<string, { count: number; total: number }> = {};
    for (const e of expenses) {
      const cat = e.category || 'other';
      const entry = catSums[cat] || { count: 0, total: 0 };
      entry.count++;
      entry.total += Number(e.amount);
      catSums[cat] = entry;
    }
    const totalForPct = expenses.length || 1;
    const topCategories = Object.entries(catSums)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([category, { count, total }]) => ({ category, count, percentage: Math.round((count / totalForPct) * 100), totalValue: total }));

    // Monthly trends
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    });
    const byMonth = this.bucketByMonth(expenses, e => e.created_at);
    const monthlyTrends = months.map(m => {
      const key = format(m, 'yyyy-MM');
      const items = byMonth.get(key) || [];
      return {
        month: key,
        amount: items.reduce((s, e) => s + Number((e as ExpenseRow).amount), 0),
        transactions: items.length,
      };
    });

    return {
      totalAmount,
      totalTransactions: expenses.length,
      averagePerMonth: totalAmount / 12,
      topCategories,
      monthlyTrends,
      savingsVsBudget: 0,
    };
  }

  private deriveProductivity(
    completedTasks: TaskRow[],
    yearStart: Date,
    yearEnd: Date,
    year: number,
  ): ProductivityMetrics {
    const daysInYear = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));

    // Day-of-week distribution
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    for (const t of completedTasks) {
      const d = new Date(t.completed_at!);
      dayCounts[getDay(d)]++;
    }
    const mostProductiveDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const weekdayCount = dayCounts[1] + dayCounts[2] + dayCounts[3] + dayCounts[4] + dayCounts[5];
    const weekendCount = dayCounts[0] + dayCounts[6];
    const total = weekdayCount + weekendCount || 1;

    // Monthly productivity scores
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    });
    const byMonth = this.bucketByMonth(completedTasks, t => t.completed_at!);
    const monthlyProductivity = months.map(m => {
      const key = format(m, 'yyyy-MM');
      return { month: key, score: byMonth.get(key)?.length || 0 };
    });

    return {
      averageTasksPerDay: completedTasks.length / daysInYear,
      mostProductiveDay: DAY_NAMES[mostProductiveDayIdx],
      mostProductiveHour: 10, // Would need hour-level data to compute accurately
      weekdayVsWeekend: {
        weekday: Math.round((weekdayCount / total) * 100),
        weekend: Math.round((weekendCount / total) * 100),
      },
      monthlyProductivity,
    };
  }

  // =====================================================
  // UTILITY
  // =====================================================

  /** Bucket rows by yyyy-MM key derived from a date field. O(n) single pass. */
  private bucketByMonth<T>(rows: T[], getDate: (row: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const key = getDate(row).slice(0, 7); // 'yyyy-MM' from ISO string
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }
    return map;
  }
}

// Export singleton instance
/** Singleton instance of the year-in-review statistics generator. */
export const yearInReviewService = new YearInReviewService();
