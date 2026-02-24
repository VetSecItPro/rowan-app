'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Home, DollarSign, TrendingDown, PieChart, FileText, Plus, Download } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { getGeneratedReports, type GeneratedReport } from '@/lib/services/financial-reports-service';
import { projectsService } from '@/lib/services/budgets-service';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

type ViewMode = 'analytics' | 'reports';

interface BudgetStatsData {
  monthlyBudget: number;
  spentThisMonth: number;
  remaining: number;
  pendingBills: number;
}

export default function BudgetAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [stats, setStats] = useState<BudgetStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecentReports = useCallback(async () => {
    if (!spaceId) return;

    try {
      setLoadingReports(true);
      const reports = await getGeneratedReports(spaceId, 3);
      setRecentReports(reports || []);
    } catch (err) {
      logger.error('Error loading recent reports:', err, { component: 'page', action: 'execution' });
    } finally {
      setLoadingReports(false);
    }
  }, [spaceId]);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await projectsService.getBudgetStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load budget stats:', err, { component: 'page', action: 'execution' });
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [spaceId]);

  useEffect(() => {
    if (spaceId && viewMode === 'analytics') {
      loadRecentReports();
    }
  }, [loadRecentReports, spaceId, viewMode]);

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasData = stats && (stats.monthlyBudget > 0 || stats.spentThisMonth > 0);
  const adherenceRate = stats && stats.monthlyBudget > 0
    ? Math.min(100, ((1 - (stats.spentThisMonth / stats.monthlyBudget)) * 100 + 100)).toFixed(0)
    : '—';

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
              className="mr-4 p-2 text-gray-400 hover:text-gray-300"
            >
              ← Back to Analytics
            </button>
            <h1 className="text-3xl font-bold text-amber-400">
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
            <h1 className="text-3xl font-bold text-amber-400 mb-2">
              Budget & Expenses Analytics
            </h1>
            <p className="text-gray-400">
              Monitor spending patterns and budget adherence
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="inline-flex items-center bg-amber-900/20 rounded-lg p-1 border border-amber-800">
              <button
                onClick={() => setViewMode('analytics')}
                className={`btn-touch px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  viewMode === 'analytics'
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-md'
                    : 'text-amber-300 hover:text-amber-100 hover:bg-amber-800/30'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setViewMode('reports')}
                className={`btn-touch px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                  (viewMode as ViewMode) === 'reports'
                    ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600 hover:shadow-md'
                    : 'text-amber-300 hover:text-amber-100 hover:bg-amber-800/30'
                }`}
              >
                Reports
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <DollarSign className="mx-auto h-16 w-16 text-amber-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Budget to see analytics here
            </p>
            <Link
              href="/projects?tab=budgets"
              className="inline-flex items-center px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Go to Budget
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(stats.spentThisMonth)}
                </h3>
                <p className="text-sm text-gray-400">Spent This Month</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <PieChart className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {adherenceRate}{adherenceRate !== '—' ? '%' : ''}
                </h3>
                <p className="text-sm text-gray-400">Budget Adherence</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(stats.remaining)}
                </h3>
                <p className="text-sm text-gray-400">Remaining</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(stats.monthlyBudget)}
                </h3>
                <p className="text-sm text-gray-400">Monthly Budget</p>
              </div>
            </div>

            {/* Budget Progress */}
            {stats.monthlyBudget > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">Budget Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      {formatCurrency(stats.spentThisMonth)} of {formatCurrency(stats.monthlyBudget)}
                    </span>
                    <span className="text-white font-medium">
                      {((stats.spentThisMonth / stats.monthlyBudget) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        stats.spentThisMonth > stats.monthlyBudget
                          ? 'bg-red-500'
                          : stats.spentThisMonth > stats.monthlyBudget * 0.8
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.spentThisMonth / stats.monthlyBudget) * 100)}%` }}
                    />
                  </div>
                  {stats.pendingBills > 0 && (
                    <p className="text-sm text-amber-400">
                      {stats.pendingBills} pending bill{stats.pendingBills > 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Financial Reports Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Financial Reports
                </h3>
                <p className="text-sm text-gray-400">
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
                className="px-4 py-2 text-amber-400 text-sm font-medium hover:text-amber-300"
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
                  <div className="bg-gray-700 rounded-lg h-16"></div>
                </div>
              ))}
            </div>
          ) : recentReports.length > 0 ? (
            <div className="space-y-3">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-white text-sm">
                        {report.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
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
                        <button className="p-1 text-gray-400 hover:text-gray-300">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewMode('reports')}
                        className="text-amber-400 text-xs font-medium hover:text-amber-300"
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
              <h4 className="text-sm font-medium text-white mb-1">
                No reports yet
              </h4>
              <p className="text-sm text-gray-400 mb-4">
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
