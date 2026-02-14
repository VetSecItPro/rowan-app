import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// ==================== TYPES ====================

export interface BudgetVariance {
  category: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'under' | 'on-track' | 'warning' | 'over';
  color: 'green' | 'blue' | 'yellow' | 'red';
}

export interface MonthlyVariance {
  month: string;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  variance_percentage: number;
  categories: BudgetVariance[];
}

export interface VarianceTrend {
  month: string;
  variance_percentage: number;
  status: 'under' | 'on-track' | 'warning' | 'over';
}

// ==================== VARIANCE CALCULATION ====================

/**
 * Determines variance status based on percentage
 */
function getVarianceStatus(
  variancePercentage: number
): { status: BudgetVariance['status']; color: BudgetVariance['color'] } {
  if (variancePercentage <= -10) {
    // More than 10% under budget
    return { status: 'under', color: 'green' };
  } else if (variancePercentage < 0) {
    // Under budget but close
    return { status: 'on-track', color: 'blue' };
  } else if (variancePercentage <= 10) {
    // Up to 10% over budget
    return { status: 'warning', color: 'yellow' };
  } else {
    // More than 10% over budget
    return { status: 'over', color: 'red' };
  }
}

/**
 * Calculates budget variance for a specific category
 */
async function calculateCategoryVariance(
  spaceId: string,
  category: string,
  budgetAmount: number,
  startDate: Date,
  endDate: Date
): Promise<BudgetVariance> {
  const supabase = createClient();

  // Get actual expenses for the category
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('space_id', spaceId)
    .eq('category', category)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  const actualAmount = expenses?.reduce((sum: number, exp: { amount: number }) => sum + parseFloat(exp.amount.toString()), 0) || 0;
  const variance = actualAmount - budgetAmount;
  const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
  const { status, color } = getVarianceStatus(variancePercentage);

  return {
    category,
    budgeted_amount: budgetAmount,
    actual_amount: actualAmount,
    variance,
    variance_percentage: variancePercentage,
    status,
    color,
  };
}

// ==================== MONTHLY VARIANCE ====================

/**
 * Gets budget variance for current month
 */
export async function getCurrentMonthVariance(spaceId: string): Promise<MonthlyVariance> {
  const now = new Date();
  return getMonthVariance(spaceId, now);
}

/**
 * Gets budget variance for a specific month
 */
export async function getMonthVariance(spaceId: string, date: Date): Promise<MonthlyVariance> {
  const supabase = createClient();

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const monthKey = format(date, 'yyyy-MM');

  // Get all budgets for the month
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, space_id, category, amount, month')
    .eq('space_id', spaceId)
    .eq('month', monthKey);

  if (error) throw error;

  if (!budgets || budgets.length === 0) {
    return {
      month: format(date, 'MMMM yyyy'),
      total_budgeted: 0,
      total_actual: 0,
      total_variance: 0,
      variance_percentage: 0,
      categories: [],
    };
  }

  // Calculate variance for each category
  const categoryVariances = await Promise.all(
    budgets.map((budget: { category: string; amount: number }) =>
      calculateCategoryVariance(
        spaceId,
        budget.category,
        budget.amount,
        monthStart,
        monthEnd
      )
    )
  );

  // Calculate totals
  const totalBudgeted = categoryVariances.reduce((sum, v) => sum + v.budgeted_amount, 0);
  const totalActual = categoryVariances.reduce((sum, v) => sum + v.actual_amount, 0);
  const totalVariance = totalActual - totalBudgeted;
  const variancePercentage = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

  return {
    month: format(date, 'MMMM yyyy'),
    total_budgeted: totalBudgeted,
    total_actual: totalActual,
    total_variance: totalVariance,
    variance_percentage: variancePercentage,
    categories: categoryVariances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)),
  };
}

// ==================== HISTORICAL TRENDS ====================

/**
 * Gets variance trends for the last N months
 */
export async function getVarianceTrends(
  spaceId: string,
  monthsBack = 6
): Promise<VarianceTrend[]> {
  const trends: VarianceTrend[] = [];

  for (let i = 0; i < monthsBack; i++) {
    const date = subMonths(new Date(), i);
    const variance = await getMonthVariance(spaceId, date);
    const { status } = getVarianceStatus(variance.variance_percentage);

    trends.unshift({
      month: format(date, 'MMM yyyy'),
      variance_percentage: variance.variance_percentage,
      status,
    });
  }

  return trends;
}

// ==================== CATEGORY ANALYSIS ====================

/**
 * Gets categories that are consistently over budget
 */
export async function getProblematicCategories(
  spaceId: string,
  monthsToAnalyze = 3
): Promise<BudgetVariance[]> {
  const problematicCategories: Map<string, number> = new Map();

  for (let i = 0; i < monthsToAnalyze; i++) {
    const date = subMonths(new Date(), i);
    const variance = await getMonthVariance(spaceId, date);

    variance.categories.forEach((cat) => {
      if (cat.status === 'over' || cat.status === 'warning') {
        const count = problematicCategories.get(cat.category) || 0;
        problematicCategories.set(cat.category, count + 1);
      }
    });
  }

  // Get categories that were over/warning in at least 2 out of 3 months
  const problematic: string[] = [];
  problematicCategories.forEach((count, category) => {
    if (count >= Math.ceil(monthsToAnalyze / 2)) {
      problematic.push(category);
    }
  });

  // Get current month variance for these categories
  const currentVariance = await getCurrentMonthVariance(spaceId);
  return currentVariance.categories.filter((cat) => problematic.includes(cat.category));
}

/**
 * Gets categories performing well (under budget)
 */
export async function getPerformingCategories(spaceId: string): Promise<BudgetVariance[]> {
  const currentVariance = await getCurrentMonthVariance(spaceId);
  return currentVariance.categories.filter((cat) => cat.status === 'under');
}

// ==================== ALERTS ====================

/**
 * Gets categories that need immediate attention
 */
export async function getCategoriesNeedingAttention(spaceId: string): Promise<BudgetVariance[]> {
  const currentVariance = await getCurrentMonthVariance(spaceId);
  return currentVariance.categories.filter((cat) => cat.status === 'over');
}

/**
 * Calculates projected end-of-month variance based on current spending rate
 */
export async function getProjectedMonthEndVariance(
  spaceId: string
): Promise<MonthlyVariance | null> {
  const now = new Date();
  const monthEnd = endOfMonth(now);

  // Calculate days elapsed and total days in month
  const daysElapsed = now.getDate();
  const totalDaysInMonth = monthEnd.getDate();
  const daysRemaining = totalDaysInMonth - daysElapsed;

  if (daysRemaining <= 0) {
    // Month is over, return actual variance
    return getCurrentMonthVariance(spaceId);
  }

  // Get current month variance
  const currentVariance = await getCurrentMonthVariance(spaceId);

  // Project each category
  const projectedCategories = currentVariance.categories.map((cat) => {
    // Calculate daily spending rate
    const dailyRate = cat.actual_amount / daysElapsed;

    // Project to end of month
    const projectedActual = cat.actual_amount + dailyRate * daysRemaining;
    const projectedVariance = projectedActual - cat.budgeted_amount;
    const projectedPercentage =
      cat.budgeted_amount > 0 ? (projectedVariance / cat.budgeted_amount) * 100 : 0;
    const { status, color } = getVarianceStatus(projectedPercentage);

    return {
      ...cat,
      actual_amount: projectedActual,
      variance: projectedVariance,
      variance_percentage: projectedPercentage,
      status,
      color,
    };
  });

  // Calculate projected totals
  const projectedTotalActual = projectedCategories.reduce((sum, v) => sum + v.actual_amount, 0);
  const projectedTotalVariance = projectedTotalActual - currentVariance.total_budgeted;
  const projectedPercentage =
    currentVariance.total_budgeted > 0
      ? (projectedTotalVariance / currentVariance.total_budgeted) * 100
      : 0;

  return {
    month: currentVariance.month + ' (Projected)',
    total_budgeted: currentVariance.total_budgeted,
    total_actual: projectedTotalActual,
    total_variance: projectedTotalVariance,
    variance_percentage: projectedPercentage,
    categories: projectedCategories,
  };
}

/** Service for budget variance analysis, trends, and category performance tracking. */
export const varianceAnalysisService = {
  getCurrentMonthVariance,
  getMonthVariance,
  getVarianceTrends,
  getProblematicCategories,
  getPerformingCategories,
  getCategoriesNeedingAttention,
  getProjectedMonthEndVariance,
};
