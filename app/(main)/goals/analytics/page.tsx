'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { getGoalAnalytics, GoalAnalytics, DateRange } from '@/lib/services/goal-analytics-service';
import StatCards from '@/components/goals/analytics/StatCards';
// Use dynamic imports for chart components to reduce initial bundle size
import {
  DynamicCompletionRateChart,
  DynamicMilestonesBarChart,
  DynamicCategorySuccessChart,
  DynamicTrendLineChart,
  DynamicProgressHeatmap,
} from '@/components/goals/analytics/DynamicGoalsCharts';
import { ArrowLeft, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { subMonths, subYears } from 'date-fns';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { ErrorRetryFullPage } from '@/components/ui/ErrorRetry';

type DateRangeOption = '1m' | '3m' | '6m' | '1y';

export default function GoalsAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [analytics, setAnalytics] = useState<GoalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('6m');

  // Memoize fetch function for reuse in retry
  const fetchAnalytics = useCallback(async () => {
    if (!spaceId) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate date range based on selected option
      const endDate = new Date();
      let startDate: Date;

      switch (dateRangeOption) {
        case '1m':
          startDate = subMonths(endDate, 1);
          break;
        case '3m':
          startDate = subMonths(endDate, 3);
          break;
        case '6m':
          startDate = subMonths(endDate, 6);
          break;
        case '1y':
          startDate = subYears(endDate, 1);
          break;
        default:
          startDate = subMonths(endDate, 6);
      }

      const dateRange: DateRange = { start: startDate, end: endDate };
      const data = await getGoalAnalytics(spaceId, dateRange);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [spaceId, dateRangeOption]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = () => {
    // TODO: Implement export functionality (PNG/PDF)
    alert('Export functionality coming soon!');
  };

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorRetryFullPage
          title="Unable to Load Analytics"
          message={error}
          onRetry={fetchAnalytics}
          errorType="network"
        />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          No analytics data available
        </div>
      </div>
    );
  }

  // Calculate most productive month from data
  const mostProductiveMonth = analytics.milestonesByWeek.length > 0
    ? {
        month: 'This Period',
        year: new Date().getFullYear(),
        completions: analytics.milestonesByWeek.reduce((sum, w) => sum + w.completed, 0),
      }
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/goals"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Goals
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Goals Analytics
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track your progress and gain insights into your goal completion patterns
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Period:
        </span>
        <div className="flex gap-2">
          {[
            { value: '1m', label: 'Last Month' },
            { value: '3m', label: '3 Months' },
            { value: '6m', label: '6 Months' },
            { value: '1y', label: '1 Year' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRangeOption(option.value as DateRangeOption)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                dateRangeOption === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8">
        <StatCards
          totalGoals={
            analytics.categoryBreakdown.reduce((sum, c) => sum + c.value, 0)
          }
          completionRate={analytics.completionRate}
          currentStreak={analytics.currentStreak}
          avgTimeToComplete={analytics.avgTimeToComplete}
          totalMilestones={analytics.milestonesByWeek.reduce(
            (sum, w) => sum + w.total,
            0
          )}
          mostProductiveMonth={mostProductiveMonth}
        />
      </div>

      {/* Charts Grid */}
      <div className="space-y-8">
        {/* Row 1: Completion Rate and Category Success */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DynamicCompletionRateChart
            completed={Math.round(
              (analytics.completionRate *
                analytics.categoryBreakdown.reduce((sum, c) => sum + c.value, 0)) /
                100
            )}
            active={
              analytics.categoryBreakdown.reduce((sum, c) => sum + c.value, 0) -
              Math.round(
                (analytics.completionRate *
                  analytics.categoryBreakdown.reduce((sum, c) => sum + c.value, 0)) /
                  100
              )
            }
            paused={0}
            cancelled={0}
          />
          <DynamicCategorySuccessChart data={analytics.successByCategory} />
        </div>

        {/* Row 2: Milestones Bar Chart and Trend Line */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DynamicMilestonesBarChart data={analytics.milestonesByWeek} />
          <DynamicTrendLineChart data={analytics.progressTrend} />
        </div>

        {/* Row 3: Activity Heatmap (Full Width) */}
        <div>
          <DynamicProgressHeatmap data={analytics.activityHeatmap} />
        </div>
      </div>
    </div>
  );
}
