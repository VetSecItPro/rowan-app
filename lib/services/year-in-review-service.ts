/**
 * Year in Review Service
 *
 * Aggregates annual statistics and generates comprehensive yearly summaries
 * for users including tasks, goals, expenses, achievements, and insights.
 */

import { createClient } from '@/lib/supabase/server';
import { startOfYear, endOfYear, format, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { Task, Expense } from '@/lib/types';

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
// YEAR IN REVIEW SERVICE
// =====================================================

export class YearInReviewService {
  /**
   * Generate comprehensive year in review for a user and space
   */
  async generateYearInReview(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    spaceId: string,
    year: number = new Date().getFullYear()
  ): Promise<YearInReviewData> {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Fetch all data in parallel for efficiency
    const [
      tasks,
      goals,
      expenses,
      badges,
      overview,
      monthlyData,
      achievements,
      insights,
      topCategories,
      goalsSummary,
      expensesSummary,
      productivity
    ] = await Promise.all([
      this.getTasksForYear(supabase, spaceId, yearStart, yearEnd),
      this.getGoalsForYear(supabase, spaceId, yearStart, yearEnd),
      this.getExpensesForYear(supabase, spaceId, yearStart, yearEnd),
      this.getBadgesForYear(userId, yearStart, yearEnd),
      this.calculateOverviewStats(supabase, spaceId, yearStart, yearEnd),
      this.calculateMonthlyBreakdown(supabase, spaceId, year),
      this.generateAchievementSummary(supabase, userId, spaceId, yearStart, yearEnd),
      this.generatePersonalInsights(supabase, spaceId, yearStart, yearEnd),
      this.getTopCategories(supabase, spaceId, yearStart, yearEnd),
      this.generateGoalsSummary(supabase, spaceId, yearStart, yearEnd),
      this.generateExpensesSummary(supabase, spaceId, yearStart, yearEnd),
      this.calculateProductivityMetrics(supabase, spaceId, yearStart, yearEnd)
    ]);

    return {
      year,
      overview,
      monthlyBreakdown: monthlyData,
      achievements,
      insights,
      topCategories,
      goals: goalsSummary,
      expenses: expensesSummary,
      productivity
    };
  }

  /**
   * Calculate overview statistics for the year
   */
  private async calculateOverviewStats(
    supabase: ReturnType<typeof createClient>,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date
  ): Promise<OverviewStats> {
    // Get completed tasks count
    const { count: tasksCompleted } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString());

    // Get achieved goals count
    const { count: goalsAchieved } = await supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString());

    // Get total expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const totalExpenses = expensesData?.reduce((sum: number, expense: Expense) => sum + Number(expense.amount), 0) || 0;

    // Get badges earned (simplified - would need actual badges table)
    const badgesEarned = Math.floor((tasksCompleted || 0) / 10); // Placeholder logic

    // Calculate active days (days with any activity)
    const { data: activeDaysData } = await supabase
      .from('tasks')
      .select('created_at')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const uniqueDays = new Set(
      activeDaysData?.map((task: Task) => format(new Date(task.created_at), 'yyyy-MM-dd'))
    );
    const activeDays = uniqueDays.size;

    const daysInYear = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const averageTasksPerDay = (tasksCompleted || 0) / daysInYear;

    // Calculate goal completion rate
    const { count: totalGoals } = await supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const goalCompletionRate = totalGoals ? ((goalsAchieved || 0) / totalGoals) * 100 : 0;

    return {
      tasksCompleted: tasksCompleted || 0,
      goalsAchieved: goalsAchieved || 0,
      totalExpenses,
      badgesEarned,
      activeDays,
      totalSavings: 0, // Would need budget data
      averageTasksPerDay,
      goalCompletionRate
    };
  }

  /**
   * Calculate monthly breakdown of activity
   */
  private async calculateMonthlyBreakdown(
    supabase: ReturnType<typeof createClient>,
    spaceId: string,
    year: number
  ): Promise<MonthlyStats[]> {
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    });

    const monthlyStats = await Promise.all(
      months.map(async (month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        // Tasks completed this month
        const { count: tasksCompleted } = await supabase
          .from('tasks')
          .select('id', { count: 'exact' })
          .eq('space_id', spaceId)
          .eq('status', 'completed')
          .gte('completed_at', monthStart.toISOString())
          .lte('completed_at', monthEnd.toISOString());

        // Goals achieved this month
        const { count: goalsAchieved } = await supabase
          .from('goals')
          .select('id', { count: 'exact' })
          .eq('space_id', spaceId)
          .eq('status', 'completed')
          .gte('completed_at', monthStart.toISOString())
          .lte('completed_at', monthEnd.toISOString());

        // Expenses this month
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount')
          .eq('space_id', spaceId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const expensesAmount = expensesData?.reduce((sum: number, expense: Expense) => sum + Number(expense.amount), 0) || 0;

        // Active days this month
        const { data: activeDaysData } = await supabase
          .from('tasks')
          .select('created_at')
          .eq('space_id', spaceId)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const uniqueDays = new Set(
          activeDaysData?.map((task: Task) => format(new Date(task.created_at), 'yyyy-MM-dd'))
        );

        return {
          month: format(month, 'yyyy-MM'),
          monthName: format(month, 'MMMM'),
          tasksCompleted: tasksCompleted || 0,
          goalsAchieved: goalsAchieved || 0,
          expensesAmount,
          badgesEarned: Math.floor((tasksCompleted || 0) / 5), // Placeholder
          activeDays: uniqueDays.size
        };
      })
    );

    return monthlyStats;
  }

  /**
   * Generate achievement summary including badges and milestones
   */
  private async generateAchievementSummary(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date
  ): Promise<AchievementSummary> {
    // This would integrate with the actual badges system
    // For now, generating sample achievements based on activity

    const { count: tasksCompleted } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString());

    const { count: goalsAchieved } = await supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString());

    // Generate sample badges based on achievements
    const badgesEarned = [];
    if ((tasksCompleted || 0) >= 100) {
      badgesEarned.push({
        id: 'task-master-100',
        type: 'achievement',
        title: 'Task Master',
        description: 'Completed 100+ tasks this year',
        earnedAt: new Date().toISOString(),
        icon: '🏆'
      });
    }

    if ((goalsAchieved || 0) >= 10) {
      badgesEarned.push({
        id: 'goal-crusher-10',
        type: 'achievement',
        title: 'Goal Crusher',
        description: 'Achieved 10+ goals this year',
        earnedAt: new Date().toISOString(),
        icon: '🎯'
      });
    }

    const milestones = [
      {
        title: 'First Goal Completed',
        description: 'Completed your first goal of the year',
        achievedAt: yearStart.toISOString(),
        value: 1,
        type: 'goals' as const
      },
      {
        title: 'Century Club',
        description: 'Completed 100 tasks',
        achievedAt: new Date().toISOString(),
        value: 100,
        type: 'tasks' as const
      }
    ].filter(milestone => {
      if (milestone.type === 'tasks') return (tasksCompleted || 0) >= milestone.value;
      if (milestone.type === 'goals') return (goalsAchieved || 0) >= milestone.value;
      return false;
    });

    const personalRecords = [
      {
        title: 'Tasks Completed',
        value: tasksCompleted || 0,
        unit: 'tasks',
        description: 'Total tasks completed this year'
      },
      {
        title: 'Goals Achieved',
        value: goalsAchieved || 0,
        unit: 'goals',
        description: 'Total goals achieved this year'
      }
    ];

    return {
      badgesEarned,
      milestones,
      personalRecords
    };
  }

  /**
   * Generate personal insights and patterns
   */
  private async generatePersonalInsights(
    supabase: ReturnType<typeof createClient>,
    spaceId: string,
    yearStart: Date,
    yearEnd: Date
  ): Promise<PersonalInsights> {
    // Get most productive month
    const monthlyData = await this.calculateMonthlyBreakdown(supabase, spaceId, yearStart.getFullYear());
    const mostProductiveMonth = monthlyData.reduce((max, month) =>
      month.tasksCompleted > max.tasksCompleted ? month : max
    ).monthName;

    // Get favorite task category
    const { data: taskCategories } = await supabase
      .from('tasks')
      .select('category')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const categoryCount = taskCategories?.reduce((acc: Record<string, number>, task: Task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const favoriteTaskCategory = Object.keys(categoryCount).reduce((a, b) =>
      categoryCount[a] > categoryCount[b] ? a : b, 'general'
    );

    // Calculate average goal completion time (simplified)
    const averageGoalCompletionTime = 30; // days - would need actual calculation

    return {
      mostProductiveMonth,
      favoriteTaskCategory,
      averageGoalCompletionTime,
      topSpendingCategory: 'groceries', // Would need actual calculation
      longestStreak: 7, // Would need streak calculation
      totalTimeWorked: 2400, // hours - would need time tracking
      improvementAreas: ['time management', 'goal setting'],
      strengths: ['task completion', 'consistency']
    };
  }

  // Placeholder methods for additional data
  private async getTasksForYear(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    return data || [];
  }

  private async getGoalsForYear(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date) {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    return data || [];
  }

  private async getExpensesForYear(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date) {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());
    return data || [];
  }

  private async getBadgesForYear(userId: string, yearStart: Date, yearEnd: Date) {
    // Would integrate with actual badges system
    return [];
  }

  private async getTopCategories(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date): Promise<CategoryStats[]> {
    // Placeholder - would aggregate categories across all entities
    return [
      { category: 'work', count: 45, percentage: 35 },
      { category: 'personal', count: 30, percentage: 23 },
      { category: 'health', count: 25, percentage: 19 }
    ];
  }

  private async generateGoalsSummary(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date): Promise<GoalsSummary> {
    const { count: totalGoals } = await supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const { count: completedGoals } = await supabase
      .from('goals')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    return {
      totalGoals: totalGoals || 0,
      completedGoals: completedGoals || 0,
      inProgressGoals: (totalGoals || 0) - (completedGoals || 0),
      completionRate: totalGoals ? ((completedGoals || 0) / totalGoals) * 100 : 0,
      averageCompletionTime: 30,
      topGoalCategories: [],
      monthlyGoalTrends: []
    };
  }

  private async generateExpensesSummary(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date): Promise<ExpensesSummary> {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('space_id', spaceId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    const totalAmount = expenses?.reduce((sum: number, expense: Expense) => sum + Number(expense.amount), 0) || 0;

    return {
      totalAmount,
      totalTransactions: expenses?.length || 0,
      averagePerMonth: totalAmount / 12,
      topCategories: [],
      monthlyTrends: [],
      savingsVsBudget: 0
    };
  }

  private async calculateProductivityMetrics(supabase: ReturnType<typeof createClient>, spaceId: string, yearStart: Date, yearEnd: Date): Promise<ProductivityMetrics> {
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('space_id', spaceId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString());

    const daysInYear = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));

    return {
      averageTasksPerDay: (totalTasks || 0) / daysInYear,
      mostProductiveDay: 'Tuesday',
      mostProductiveHour: 10,
      weekdayVsWeekend: { weekday: 75, weekend: 25 },
      monthlyProductivity: []
    };
  }
}

// Export singleton instance
export const yearInReviewService = new YearInReviewService();