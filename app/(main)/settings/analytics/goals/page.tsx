'use client';

import { useState, useEffect } from 'react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Target, Award, TrendingUp, CheckCircle, Calendar, BarChart3, Activity, Zap } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { DynamicAreaChart, DynamicPieChart, DynamicBarChart } from '@/components/charts/DynamicCharts';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  getGoalAnalytics,
  getGoalQuickStats,
  type GoalAnalytics,
} from '@/lib/services/goal-analytics-service';

type TimeRange = '1m' | '3m' | '6m' | '12m';

export default function GoalsAnalyticsPage() {
  const { currentSpace } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      if (!currentSpace) return;

      try {
        setLoading(true);
        setError(null);

        const monthsBack = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
        const endDate = new Date();
        const startDate = subMonths(endDate, monthsBack);

        const [analyticsData, statsData] = await Promise.all([
          getGoalAnalytics(currentSpace.id, { start: startDate, end: endDate }),
          getGoalQuickStats(currentSpace.id),
        ]);

        setAnalytics(analyticsData);
        setQuickStats(statsData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [currentSpace, timeRange]);

  if (!currentSpace) {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Settings', href: '/settings' },
          { label: 'Analytics', href: '/settings/analytics' },
          { label: 'Goals & Milestones' },
        ]}
      >
        <div className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Please select a space to continue</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Goals & Milestones' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Time Range Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              Goals & Milestones Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track goal progress and milestone achievements
            </p>
          </div>

          {/* Time Range Toggle */}
          <div className="inline-flex items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-1 border border-indigo-200 dark:border-indigo-800">
            {[
              { value: '1m', label: 'Last Month' },
              { value: '3m', label: 'Last 3 Months' },
              { value: '6m', label: 'Last 6 Months' },
              { value: '12m', label: 'Last 12 Months' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value as TimeRange)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  timeRange === option.value
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            {quickStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      +{quickStats.completedGoals}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {quickStats.completionRate.toFixed(1)}%
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {quickStats.activeGoals} active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {quickStats.totalGoals}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {quickStats.completedMilestones} done
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {quickStats.totalMilestones}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Milestones</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {analytics?.avgTimeToComplete || 0} days avg
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {analytics?.currentStreak || 0}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Progress Trend */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Progress Trend
                    </h3>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full">
                      {format(new Date(), 'MMM yyyy')}
                    </span>
                  </div>
                  <DynamicAreaChart
                    data={analytics.progressTrend}
                    xDataKey="date"
                    areaDataKey="progress"
                    areaColor="#6366f1"
                    height={300}
                    showGrid={true}
                    showLegend={false}
                    fillOpacity={0.3}
                  />
                </div>

                {/* Category Breakdown */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Goals by Category
                    </h3>
                  </div>
                  <DynamicPieChart
                    data={analytics.categoryBreakdown.map(item => ({
                      name: item.category,
                      value: item.value,
                      color: item.color
                    }))}
                    colors={analytics.categoryBreakdown.map(item => item.color)}
                    height={300}
                  />
                </div>

                {/* Milestones by Week */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Weekly Milestones
                    </h3>
                  </div>
                  <DynamicBarChart
                    data={analytics.milestonesByWeek}
                    xDataKey="week"
                    yDataKey="completed"
                    barColor="#10b981"
                    height={300}
                    showGrid={true}
                    showLegend={true}
                  />
                </div>

                {/* Success by Category */}
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Success Rate by Category
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(analytics.successByCategory).map(([category, stats]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {category}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {stats.rate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stats.rate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{stats.completed} completed</span>
                          <span>{stats.total} total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Summary */}
            {analytics && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                    Activity Summary
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {analytics.currentStreak}
                    </p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">Current Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {analytics.longestStreak}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Longest Streak</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analytics.avgTimeToComplete}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">Avg Days to Complete</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {analytics.completionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Success Rate</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </FeatureLayout>
  );
}