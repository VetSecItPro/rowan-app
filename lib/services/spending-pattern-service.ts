import { createClient } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths, parseISO } from 'date-fns';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';

// ==================== TYPES ====================

export interface SpendingPattern {
  category: string;
  average_monthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trend_percentage: number;
  seasonality: 'high' | 'medium' | 'low';
  predictability: number; // 0-100 score
}

export interface MonthlyTrend {
  month: string;
  total: number;
  categories: Record<string, number>;
}

export interface SpendingForecast {
  category: string;
  next_month_prediction: number;
  confidence: number; // 0-100
  historical_average: number;
}

export interface SpendingInsight {
  type: 'warning' | 'tip' | 'achievement';
  category: string;
  message: string;
  impact: number; // dollar amount
  severity: 'high' | 'medium' | 'low';
}

export interface DayOfWeekPattern {
  day: string;
  average_spending: number;
  transaction_count: number;
}

// ==================== PATTERN ANALYSIS ====================

/**
 * Internal function to analyze spending patterns
 * Optimized: Single query fetches all data, then groups in memory
 */
async function _analyzeSpendingPatterns(
  spaceId: string,
  monthsToAnalyze: number
): Promise<SpendingPattern[]> {
  const supabase = createClient();

  // Calculate date range for entire period
  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(new Date(), monthsToAnalyze - 1));

  // Single query to fetch all expenses in the date range
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('category, amount, date')
    .eq('space_id', spaceId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Get monthly spending data for each category
  const categoryPatterns: Map<string, number[]> = new Map();

  // Group expenses by month and category in memory
  expenses?.forEach((exp: { category?: string | null; amount: number; date: string }) => {
    const expDate = parseISO(exp.date);
    const cat = exp.category || 'Uncategorized';
    const amount = parseFloat(exp.amount.toString());

    // Calculate month index (0 = current month, 1 = last month, etc.)
    const monthIndex = differenceInMonths(new Date(), expDate);

    // Only include if within our analysis window
    if (monthIndex >= 0 && monthIndex < monthsToAnalyze) {
      if (!categoryPatterns.has(cat)) {
        categoryPatterns.set(cat, new Array(monthsToAnalyze).fill(0));
      }
      categoryPatterns.get(cat)![monthIndex] += amount;
    }
  });

  // Analyze patterns for each category
  const patterns: SpendingPattern[] = [];

  categoryPatterns.forEach((monthlyAmounts, category) => {
    // Calculate average
    const average = monthlyAmounts.reduce((sum, amt) => sum + amt, 0) / monthlyAmounts.length;

    // Calculate trend (compare recent 3 months vs older 3 months)
    const recentAvg = monthlyAmounts.slice(0, 3).reduce((sum, amt) => sum + amt, 0) / 3;
    const olderAvg = monthlyAmounts.slice(3).reduce((sum, amt) => sum + amt, 0) / 3;
    const trendPercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(trendPercentage) < 10) {
      trend = 'stable';
    } else if (trendPercentage > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Calculate predictability (inverse of coefficient of variation)
    const stdDev = Math.sqrt(
      monthlyAmounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) / monthlyAmounts.length
    );
    const coefficientOfVariation = average > 0 ? stdDev / average : 1;
    const predictability = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

    // Determine seasonality (high if max is > 50% above average)
    const maxAmount = Math.max(...monthlyAmounts);
    const seasonalityRatio = average > 0 ? maxAmount / average : 1;
    let seasonality: 'high' | 'medium' | 'low';
    if (seasonalityRatio > 1.5) {
      seasonality = 'high';
    } else if (seasonalityRatio > 1.2) {
      seasonality = 'medium';
    } else {
      seasonality = 'low';
    }

    patterns.push({
      category,
      average_monthly: average,
      trend,
      trend_percentage: trendPercentage,
      seasonality,
      predictability,
    });
  });

  // Sort by average spending (highest first)
  return patterns.sort((a, b) => b.average_monthly - a.average_monthly);
}

/**
 * Analyzes spending patterns over the last N months
 * Cached for 5 minutes to reduce database load
 */
export async function analyzeSpendingPatterns(
  spaceId: string,
  monthsToAnalyze = 6
): Promise<SpendingPattern[]> {
  return cacheAside(
    cacheKeys.spendingPatterns(spaceId, monthsToAnalyze),
    () => _analyzeSpendingPatterns(spaceId, monthsToAnalyze),
    CACHE_TTL.MEDIUM // 5 minutes
  );
}

// ==================== FORECASTING ====================

/**
 * Forecasts next month's spending based on historical patterns
 */
export async function forecastNextMonthSpending(
  spaceId: string
): Promise<SpendingForecast[]> {
  const patterns = await analyzeSpendingPatterns(spaceId, 6);

  return patterns.map((pattern) => {
    // Simple linear forecast based on trend
    let prediction = pattern.average_monthly;

    // Adjust for trend
    if (pattern.trend === 'increasing') {
      prediction *= 1 + Math.abs(pattern.trend_percentage) / 100;
    } else if (pattern.trend === 'decreasing') {
      prediction *= 1 - Math.abs(pattern.trend_percentage) / 100;
    }

    // Confidence is based on predictability
    const confidence = pattern.predictability;

    return {
      category: pattern.category,
      next_month_prediction: Math.round(prediction * 100) / 100,
      confidence,
      historical_average: pattern.average_monthly,
    };
  });
}

// ==================== INSIGHTS GENERATION ====================

/**
 * Generates actionable insights based on spending patterns
 */
export async function generateSpendingInsights(
  spaceId: string
): Promise<SpendingInsight[]> {
  const patterns = await analyzeSpendingPatterns(spaceId, 6);
  const insights: SpendingInsight[] = [];

  patterns.forEach((pattern) => {
    // Warning: Increasing trend with high spending
    if (pattern.trend === 'increasing' && pattern.trend_percentage > 15) {
      insights.push({
        type: 'warning',
        category: pattern.category,
        message: `${pattern.category} spending is up ${Math.abs(pattern.trend_percentage).toFixed(0)}% from previous months`,
        impact: (pattern.average_monthly * pattern.trend_percentage) / 100,
        severity: pattern.trend_percentage > 30 ? 'high' : 'medium',
      });
    }

    // Achievement: Decreasing trend
    if (pattern.trend === 'decreasing' && pattern.trend_percentage < -15) {
      insights.push({
        type: 'achievement',
        category: pattern.category,
        message: `Great job! ${pattern.category} spending decreased by ${Math.abs(pattern.trend_percentage).toFixed(0)}%`,
        impact: Math.abs((pattern.average_monthly * pattern.trend_percentage) / 100),
        severity: 'low',
      });
    }

    // Tip: High seasonality
    if (pattern.seasonality === 'high') {
      insights.push({
        type: 'tip',
        category: pattern.category,
        message: `${pattern.category} has high seasonal variation. Consider budgeting extra during peak months`,
        impact: 0,
        severity: 'low',
      });
    }

    // Tip: Low predictability
    if (pattern.predictability < 40) {
      insights.push({
        type: 'tip',
        category: pattern.category,
        message: `${pattern.category} spending is unpredictable. Consider tracking this category more closely`,
        impact: 0,
        severity: 'medium',
      });
    }
  });

  // Sort by severity and impact
  return insights.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.impact - a.impact;
  });
}

// ==================== DAY OF WEEK PATTERNS ====================

/**
 * Analyzes spending patterns by day of week
 */
export async function analyzeDayOfWeekPatterns(
  spaceId: string,
  monthsBack = 3
): Promise<DayOfWeekPattern[]> {
  const supabase = createClient();

  const startDate = subMonths(new Date(), monthsBack);

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('date, amount')
    .eq('space_id', spaceId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .order('date', { ascending: true });

  if (error) throw error;

  // Group by day of week
  const dayTotals: Record<number, { total: number; count: number }> = {
    0: { total: 0, count: 0 }, // Sunday
    1: { total: 0, count: 0 }, // Monday
    2: { total: 0, count: 0 }, // Tuesday
    3: { total: 0, count: 0 }, // Wednesday
    4: { total: 0, count: 0 }, // Thursday
    5: { total: 0, count: 0 }, // Friday
    6: { total: 0, count: 0 }, // Saturday
  };

  expenses?.forEach((exp: { date: string; amount: number }) => {
    const date = parseISO(exp.date);
    const dayOfWeek = date.getDay();
    dayTotals[dayOfWeek].total += parseFloat(exp.amount.toString());
    dayTotals[dayOfWeek].count += 1;
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return dayNames.map((day, index) => ({
    day,
    average_spending: dayTotals[index].count > 0 ? dayTotals[index].total / dayTotals[index].count : 0,
    transaction_count: dayTotals[index].count,
  }));
}

// ==================== MONTHLY TRENDS ====================

/**
 * Internal function to get monthly spending trends
 * Optimized: Single query fetches all data, then groups in memory
 */
async function _getMonthlyTrends(
  spaceId: string,
  monthsBack: number
): Promise<MonthlyTrend[]> {
  const supabase = createClient();

  // Calculate date range for entire period
  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(new Date(), monthsBack - 1));

  // Single query to fetch all expenses in the date range
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('category, amount, date')
    .eq('space_id', spaceId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;

  // Initialize month buckets
  const monthBuckets: Map<string, { total: number; categories: Record<string, number> }> = new Map();

  for (let i = 0; i < monthsBack; i++) {
    const date = subMonths(new Date(), i);
    const monthKey = format(date, 'MMM yyyy');
    monthBuckets.set(monthKey, { total: 0, categories: {} });
  }

  // Group expenses by month in memory
  expenses?.forEach((exp: { amount: number; category?: string | null; date: string }) => {
    const expDate = parseISO(exp.date);
    const monthKey = format(expDate, 'MMM yyyy');
    const amount = parseFloat(exp.amount.toString());
    const cat = exp.category || 'Uncategorized';

    const bucket = monthBuckets.get(monthKey);
    if (bucket) {
      bucket.total += amount;
      bucket.categories[cat] = (bucket.categories[cat] || 0) + amount;
    }
  });

  // Convert to array in chronological order (oldest first)
  const trends: MonthlyTrend[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthKey = format(date, 'MMM yyyy');
    const bucket = monthBuckets.get(monthKey)!;
    trends.push({
      month: monthKey,
      total: bucket.total,
      categories: bucket.categories,
    });
  }

  return trends;
}

/**
 * Gets monthly spending trends
 * Cached for 5 minutes to reduce database load
 */
export async function getMonthlyTrends(
  spaceId: string,
  monthsBack = 12
): Promise<MonthlyTrend[]> {
  return cacheAside(
    cacheKeys.spendingTrends(spaceId, monthsBack),
    () => _getMonthlyTrends(spaceId, monthsBack),
    CACHE_TTL.MEDIUM // 5 minutes
  );
}

// ==================== ANOMALY DETECTION ====================

/**
 * Detects unusual spending anomalies
 */
export async function detectSpendingAnomalies(
  spaceId: string
): Promise<SpendingInsight[]> {
  const patterns = await analyzeSpendingPatterns(spaceId, 6);
  const supabase = createClient();
  const anomalies: SpendingInsight[] = [];

  // Get current month expenses
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const { data: currentExpenses, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('space_id', spaceId)
    .gte('date', format(monthStart, 'yyyy-MM-dd'))
    .lte('date', format(monthEnd, 'yyyy-MM-dd'));

  if (error) throw error;

  // Calculate current month totals by category
  const currentTotals: Record<string, number> = {};
  currentExpenses?.forEach((exp: { category?: string | null; amount: number }) => {
    const cat = exp.category || 'Uncategorized';
    currentTotals[cat] = (currentTotals[cat] || 0) + parseFloat(exp.amount.toString());
  });

  // Compare to historical patterns
  patterns.forEach((pattern) => {
    const currentAmount = currentTotals[pattern.category] || 0;
    const deviation = ((currentAmount - pattern.average_monthly) / pattern.average_monthly) * 100;

    // Flag if more than 50% above average
    if (Math.abs(deviation) > 50) {
      anomalies.push({
        type: 'warning',
        category: pattern.category,
        message: `${pattern.category} is ${Math.abs(deviation).toFixed(0)}% ${deviation > 0 ? 'above' : 'below'} your usual spending`,
        impact: Math.abs(currentAmount - pattern.average_monthly),
        severity: Math.abs(deviation) > 100 ? 'high' : 'medium',
      });
    }
  });

  return anomalies;
}

// Export service object
export const spendingPatternService = {
  analyzeSpendingPatterns,
  forecastNextMonthSpending,
  generateSpendingInsights,
  analyzeDayOfWeekPatterns,
  getMonthlyTrends,
  detectSpendingAnomalies,
};
