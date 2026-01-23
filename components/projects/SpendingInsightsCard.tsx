'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar, AlertCircle } from 'lucide-react';
import { spendingInsightsService, type TimeRange, type SpendingInsights } from '@/lib/services/spending-insights-service';
import { logger } from '@/lib/logger';

interface SpendingInsightsCardProps {
  spaceId: string;
}

export function SpendingInsightsCard({ spaceId }: SpendingInsightsCardProps) {
  const [insights, setInsights] = useState<SpendingInsights | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadInsights is a stable function
  }, [spaceId, timeRange]);

  async function loadInsights() {
    try {
      setIsLoading(true);
      const data = await spendingInsightsService.getSpendingInsights(spaceId, timeRange);
      setInsights(data);
    } catch (error) {
      logger.error('Failed to load spending insights:', error, { component: 'SpendingInsightsCard', action: 'component_action' });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No spending data available</p>
        </div>
      </div>
    );
  }

  const { current_period, trends, top_categories, budget_variances } = insights;
  const maxTrendValue = Math.max(...trends.map(t => t.total_spent), 1);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Spending Insights
              </h3>
              <p className="text-sm text-gray-400">
                Analyze your spending patterns
              </p>
            </div>
          </div>

          {/* Time Range Toggle */}
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
            {(['monthly', 'quarterly', 'yearly'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-gray-800 text-amber-600 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Current Period Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Spent</div>
            <div className="text-2xl font-bold text-white">
              ${current_period.total_spent.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Budget</div>
            <div className="text-2xl font-bold text-white">
              ${current_period.total_budget.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Variance</div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${
                current_period.variance >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                ${Math.abs(current_period.variance).toLocaleString()}
              </div>
              {current_period.variance >= 0 ? (
                <TrendingDown className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingUp className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className={`text-xs ${
              current_period.variance >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {current_period.variance >= 0 ? 'Under' : 'Over'} budget by {Math.abs(current_period.variance_percentage)}%
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Spending Trends */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            Spending Trends ({timeRange})
          </h4>
          <div className="space-y-3">
            {trends.map((trend, index) => {
              const heightPercentage = (trend.total_spent / maxTrendValue) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-400 font-medium">
                    {trend.period}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${heightPercentage}%` }}
                      >
                        {heightPercentage > 20 && (
                          <span className="text-xs font-semibold text-white">
                            ${trend.total_spent.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {heightPercentage <= 20 && trend.total_spent > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          ${trend.total_spent.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-20 text-xs text-gray-500 text-right">
                    {trend.transaction_count} txns
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Categories */}
        {top_categories.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">
              Top Spending Categories
            </h4>
            <div className="space-y-3">
              {top_categories.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {category.category}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        ${category.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative h-2 bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {category.percentage.toFixed(1)}% of total
                      </span>
                      <span className="text-xs text-gray-400">
                        {category.transaction_count} transactions
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget Variances */}
        {budget_variances.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Budget Variances
            </h4>
            <div className="space-y-2">
              {budget_variances.slice(0, 5).map((variance, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    variance.status === 'over'
                      ? 'bg-red-900/10 border-red-900/30'
                      : variance.status === 'under'
                      ? 'bg-green-900/10 border-green-900/30'
                      : 'bg-gray-900 border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {variance.category_name}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        variance.status === 'over'
                          ? 'text-red-400'
                          : variance.status === 'under'
                          ? 'text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {variance.variance >= 0 ? '+' : ''}${variance.variance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      ${variance.spent_amount.toLocaleString()} of ${variance.allocated_amount.toLocaleString()}
                    </span>
                    <span className={
                      variance.status === 'over'
                        ? 'text-red-400'
                        : variance.status === 'under'
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }>
                      {variance.variance_percentage >= 0 ? '+' : ''}{variance.variance_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        variance.status === 'over'
                          ? 'bg-red-500'
                          : variance.status === 'under'
                          ? 'bg-green-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min((variance.spent_amount / variance.allocated_amount) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
