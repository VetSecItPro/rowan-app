import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, startOfQuarter, startOfYear, subMonths, format } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

export type TimeRange = 'monthly' | 'quarterly' | 'yearly';

export interface SpendingTrend {
  period: string;
  total_spent: number;
  transaction_count: number;
}

export interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface BudgetVariance {
  category_name: string;
  allocated_amount: number;
  spent_amount: number;
  variance: number;
  variance_percentage: number;
  status: 'under' | 'over' | 'on_track';
}

export interface SpendingInsights {
  current_period: {
    total_spent: number;
    total_budget: number;
    variance: number;
    variance_percentage: number;
  };
  trends: SpendingTrend[];
  top_categories: CategorySpending[];
  budget_variances: BudgetVariance[];
}

// =====================================================
// ANALYTICS OPERATIONS
// =====================================================

/**
 * Retrieves spending totals grouped by time period for trend analysis.
 * Supports monthly, quarterly, and yearly aggregations.
 * Fills in missing periods with zero values for continuous charting.
 * @param spaceId - The space ID
 * @param timeRange - Aggregation period: 'monthly', 'quarterly', or 'yearly' (default: 'monthly')
 * @param periodsCount - Number of periods to retrieve (default: 6)
 * @returns Array of spending trends with period labels and totals
 * @throws Error if the database query fails
 */
export async function getSpendingTrends(
  spaceId: string,
  timeRange: TimeRange = 'monthly',
  periodsCount: number = 6
): Promise<SpendingTrend[]> {
  const supabase = createClient();
  const now = new Date();

  // Calculate date ranges based on time range
  let startDate: Date;
  let dateFormat: string;

  switch (timeRange) {
    case 'yearly':
      startDate = startOfYear(subMonths(now, (periodsCount - 1) * 12));
      dateFormat = 'yyyy';
      break;
    case 'quarterly':
      startDate = startOfQuarter(subMonths(now, (periodsCount - 1) * 3));
      dateFormat = 'yyyy-QQQ';
      break;
    case 'monthly':
    default:
      startDate = startOfMonth(subMonths(now, periodsCount - 1));
      dateFormat = 'MMM yyyy';
      break;
  }

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount, created_at')
    .eq('space_id', spaceId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group expenses by period
  const trendsMap = new Map<string, { total: number; count: number }>();

  expenses?.forEach((expense: { created_at: string; amount: number }) => {
    const expenseDate = new Date(expense.created_at);
    const period = format(expenseDate, dateFormat);

    const existing = trendsMap.get(period) || { total: 0, count: 0 };
    trendsMap.set(period, {
      total: existing.total + expense.amount,
      count: existing.count + 1,
    });
  });

  // Convert to array and fill missing periods
  const trends: SpendingTrend[] = [];
  for (let i = periodsCount - 1; i >= 0; i--) {
    let periodDate: Date;
    switch (timeRange) {
      case 'yearly':
        periodDate = subMonths(now, i * 12);
        break;
      case 'quarterly':
        periodDate = subMonths(now, i * 3);
        break;
      case 'monthly':
      default:
        periodDate = subMonths(now, i);
        break;
    }

    const period = format(periodDate, dateFormat);
    const data = trendsMap.get(period) || { total: 0, count: 0 };

    trends.push({
      period,
      total_spent: Math.round(data.total * 100) / 100,
      transaction_count: data.count,
    });
  }

  return trends;
}

/**
 * Retrieves expense totals grouped by category for a date range.
 * Includes percentage of total spending and transaction counts.
 * Results sorted by total amount descending.
 * @param spaceId - The space ID
 * @param startDate - Start of date range (default: start of current month)
 * @param endDate - End of date range (default: end of current month)
 * @returns Array of category spending with totals, percentages, and counts
 * @throws Error if the database query fails
 */
export async function getCategorySpending(
  spaceId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CategorySpending[]> {
  const supabase = createClient();

  // Default to current month if no dates provided
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('space_id', spaceId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) throw error;

  // Group by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  let totalSpent = 0;

  expenses?.forEach((expense: { category: string | null; amount: number }) => {
    const category = expense.category || 'Uncategorized';
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + expense.amount,
      count: existing.count + 1,
    });
    totalSpent += expense.amount;
  });

  // Convert to array and calculate percentages
  const categorySpending: CategorySpending[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      percentage: totalSpent > 0 ? Math.round((data.total / totalSpent) * 10000) / 100 : 0,
      transaction_count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  return categorySpending;
}

/**
 * Calculates variance between budgeted and actual spending per category.
 * Returns status indicators: 'under' (>10% remaining), 'over' (exceeded), 'on_track'.
 * Results sorted by absolute variance descending.
 * @param spaceId - The space ID
 * @param startDate - Start of date range (default: start of current month)
 * @param endDate - End of date range (default: end of current month)
 * @returns Array of budget variances with amounts, percentages, and status
 * @throws Error if the database query fails
 */
export async function getBudgetVariances(
  spaceId: string,
  startDate?: Date,
  endDate?: Date
): Promise<BudgetVariance[]> {
  const supabase = createClient();

  // Default to current month if no dates provided
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  // Get budget categories
  const { data: budgetCategories, error: budgetError } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('space_id', spaceId);

  if (budgetError) throw budgetError;

  // Get actual spending by category
  const categorySpending = await getCategorySpending(spaceId, start, end);
  const spendingMap = new Map(categorySpending.map(c => [c.category, c.total]));

  // Calculate variances
  const variances: BudgetVariance[] = budgetCategories?.map((budget: { category_name: string; allocated_amount: number }) => {
    const spent = spendingMap.get(budget.category_name) || 0;
    const variance = budget.allocated_amount - spent;
    const variance_percentage = budget.allocated_amount > 0
      ? Math.round((variance / budget.allocated_amount) * 10000) / 100
      : 0;

    let status: 'under' | 'over' | 'on_track' = 'on_track';
    if (variance < 0) {
      status = 'over';
    } else if (variance_percentage > 10) {
      status = 'under';
    }

    return {
      category_name: budget.category_name,
      allocated_amount: budget.allocated_amount,
      spent_amount: Math.round(spent * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variance_percentage,
      status,
    };
  }) || [];

  return variances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

/**
 * Generates a comprehensive spending insights dashboard for the current month.
 * Combines trends, category breakdown, and budget variances in a single call.
 * @param spaceId - The space ID
 * @param timeRange - Time range for trend data (default: 'monthly')
 * @returns Complete insights object with current period stats, trends, top categories, and variances
 * @throws Error if any underlying query fails
 */
export async function getSpendingInsights(
  spaceId: string,
  timeRange: TimeRange = 'monthly'
): Promise<SpendingInsights> {
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  const [trends, topCategories, budgetVariances] = await Promise.all([
    getSpendingTrends(spaceId, timeRange, 6),
    getCategorySpending(spaceId, startDate, endDate),
    getBudgetVariances(spaceId, startDate, endDate),
  ]);

  // Calculate current period totals
  const total_spent = topCategories.reduce((sum, cat) => sum + cat.total, 0);
  const total_budget = budgetVariances.reduce((sum, bv) => sum + bv.allocated_amount, 0);
  const variance = total_budget - total_spent;
  const variance_percentage = total_budget > 0
    ? Math.round((variance / total_budget) * 10000) / 100
    : 0;

  return {
    current_period: {
      total_spent: Math.round(total_spent * 100) / 100,
      total_budget: Math.round(total_budget * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variance_percentage,
    },
    trends,
    top_categories: topCategories.slice(0, 5), // Top 5 categories
    budget_variances: budgetVariances,
  };
}

/**
 * Compares spending between current and previous month.
 * Returns absolute change and percentage change for quick trend assessment.
 * @param spaceId - The space ID
 * @returns Comparison object with current/previous totals and change metrics
 * @throws Error if the database query fails
 */
export async function getMonthOverMonthComparison(
  spaceId: string
): Promise<{
  current_month: number;
  previous_month: number;
  change: number;
  change_percentage: number;
}> {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const previousMonthStart = startOfMonth(subMonths(now, 1));
  const previousMonthEnd = endOfMonth(subMonths(now, 1));

  const supabase = createClient();

  const [currentData, previousData] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount')
      .eq('space_id', spaceId)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('space_id', spaceId)
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString()),
  ]);

  if (currentData.error) throw currentData.error;
  if (previousData.error) throw previousData.error;

  const current_month = currentData.data?.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;
  const previous_month = previousData.data?.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0) || 0;
  const change = current_month - previous_month;
  const change_percentage = previous_month > 0
    ? Math.round((change / previous_month) * 10000) / 100
    : 0;

  return {
    current_month: Math.round(current_month * 100) / 100,
    previous_month: Math.round(previous_month * 100) / 100,
    change: Math.round(change * 100) / 100,
    change_percentage,
  };
}

// Export service object
export const spendingInsightsService = {
  getSpendingTrends,
  getCategorySpending,
  getBudgetVariances,
  getSpendingInsights,
  getMonthOverMonthComparison,
};
