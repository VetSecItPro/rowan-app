'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Home, DollarSign, TrendingDown, PieChart, FileText, Plus, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { getGeneratedReports, type GeneratedReport } from '@/lib/services/financial-reports-service';

type TimeRange = '1m' | '3m' | '6m' | '12m';
type ViewMode = 'analytics' | 'reports';

export default function BudgetAnalyticsPage() {
  const params = useParams();
  const spaceId = params.spaceId as string;

  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (spaceId && viewMode === 'analytics') {
      loadRecentReports();
    }
  }, [spaceId, viewMode]);

  const loadRecentReports = async () => {
    if (!spaceId) return;

    try {
      setLoadingReports(true);
      const reports = await getGeneratedReports(spaceId, 3); // Get 3 most recent reports
      setRecentReports(reports || []);
    } catch (error) {
      console.error('Error loading recent reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const stats = [
    {
      label: 'Total Expenses',
      value: '$4,287',
      change: '-$213',
      trend: 'up',
      icon: DollarSign,
      gradient: 'from-amber-500 to-amber-600',
    },
    {
      label: 'Budget Adherence',
      value: '93%',
      change: '+5%',
      trend: 'up',
      icon: PieChart,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Savings Rate',
      value: '18%',
      change: '+3%',
      trend: 'up',
      icon: TrendingDown,
      gradient: 'from-green-500 to-green-600',
    },
    {
      label: 'Household Costs',
      value: '$1,842',
      change: '-$95',
      trend: 'up',
      icon: Home,
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  // If in reports mode, render the ReportsPage component
  if (viewMode === 'reports') {
    return (
      <FeatureLayout
        breadcrumbItems={[
          { label: 'Settings', href: '/settings' },
          { label: 'Analytics', href: '/settings/analytics' },
          { label: 'Budget & Expenses' },
        ]}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center">
            <button
              onClick={() => setViewMode('analytics')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ← Back to Analytics
            </button>
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              Financial Reports
            </h1>
          </div>
          <ReportsPage />
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Budget & Expenses' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with View Mode Toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              Budget & Expenses Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor spending patterns and budget adherence
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 rounded-lg p-1 border border-amber-200 dark:border-amber-800">
              <button
                onClick={() => setViewMode('analytics')}
                className={`btn-touch px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 hover-lift shimmer-amber active-press ${
                  viewMode === 'analytics'
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-md'
                    : 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setViewMode('reports')}
                className={`btn-touch px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 hover-lift shimmer-amber active-press ${
                  viewMode === 'reports'
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-md'
                    : 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                }`}
              >
                Reports
              </button>
            </div>

            {/* Time Range Toggle */}
            <div className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 rounded-lg p-1 border border-amber-200 dark:border-amber-800">
              {[
                { value: '1m', label: 'Last Month' },
                { value: '3m', label: 'Last 3 Months' },
                { value: '6m', label: 'Last 6 Months' },
                { value: '12m', label: 'Last 12 Months' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as TimeRange)}
                  className={`btn-touch px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 hover-lift shimmer-amber active-press ${
                    timeRange === option.value
                      ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-md'
                      : 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Metrics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Category Breakdown
              </h3>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Housing', value: 45, color: 'bg-amber-500' },
                { label: 'Groceries', value: 30, color: 'bg-orange-500' },
                { label: 'Utilities', value: 25, color: 'bg-yellow-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spending Trends */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Spending Trends
              </h3>
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-full">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Fixed Costs', value: 60, color: 'bg-blue-500' },
                { label: 'Variable Costs', value: 30, color: 'bg-purple-500' },
                { label: 'Discretionary', value: 10, color: 'bg-indigo-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Reports Section */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Financial Reports
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate detailed reports and insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('reports')}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </button>
              <button
                onClick={() => setViewMode('reports')}
                className="px-4 py-2 text-amber-600 dark:text-amber-400 text-sm font-medium hover:text-amber-700 dark:hover:text-amber-300"
              >
                View All
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          {loadingReports ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-16"></div>
                </div>
              ))}
            </div>
          ) : recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {report.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{report.report_type}</span>
                        <span>
                          {format(new Date(report.date_range_start), 'MMM d')} - {format(new Date(report.date_range_end), 'MMM d, yyyy')}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.pdf_url && (
                        <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewMode('reports')}
                        className="text-amber-600 dark:text-amber-400 text-xs font-medium hover:text-amber-700 dark:hover:text-amber-300"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No reports yet
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Create your first financial report to get detailed insights
              </p>
              <button
                onClick={() => setViewMode('reports')}
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Report
              </button>
            </div>
          )}
        </div>
      </div>
    </FeatureLayout>
  );
}
