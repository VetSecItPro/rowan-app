'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CheckSquare, TrendingUp, Clock, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { tasksService } from '@/lib/services/tasks-service';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface TaskStatsData {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  onHold: number;
  byPriority: Record<string, number>;
}

export default function TasksAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [stats, setStats] = useState<TaskStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await tasksService.getTaskStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load task stats:', err, { component: 'page', action: 'execution' });
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [spaceId]);

  if (!spaceId) {
    return <SpacesLoadingState />;
  }

  const hasData = stats && stats.total > 0;
  const completionRate = hasData ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Tasks & Chores' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 mb-2">
              Tasks & Chores Analytics
            </h1>
            <p className="text-gray-400">
              Track productivity and completion trends for tasks and household chores
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <CheckSquare className="mx-auto h-16 w-16 text-blue-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Tasks to see analytics here
            </p>
            <Link
              href="/tasks"
              className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go to Tasks
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <CheckSquare className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{completionRate}%</h3>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-400">
                    {stats.inProgress} active
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.pending}</h3>
                <p className="text-sm text-gray-400">Pending Tasks</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-400">
                    +{stats.completed}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.total}</h3>
                <p className="text-sm text-gray-400">Total Tasks</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  {stats.blocked > 0 && (
                    <span className="text-sm font-medium text-amber-400">
                      {stats.blocked} blocked
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.completed}</h3>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Priority Distribution
                  </h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.byPriority).length > 0 ? (
                    Object.entries(stats.byPriority).map(([priority, count]) => {
                      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      const colorMap: Record<string, string> = {
                        high: 'bg-red-500',
                        medium: 'bg-yellow-500',
                        low: 'bg-green-500',
                        urgent: 'bg-red-600',
                      };
                      return (
                        <div key={priority}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300 capitalize">
                              {priority} Priority
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`${colorMap[priority] || 'bg-blue-500'} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-400 text-sm">No priority data available</p>
                  )}
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Status Breakdown
                  </h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
                    { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-500' },
                    { label: 'Pending', value: stats.pending, color: 'bg-yellow-500' },
                    { label: 'Blocked', value: stats.blocked, color: 'bg-red-500' },
                    { label: 'On Hold', value: stats.onHold, color: 'bg-gray-500' },
                  ]
                    .filter((item) => item.value > 0)
                    .map((item) => {
                      const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300">
                              {item.label}
                            </span>
                            <span className="text-sm font-semibold text-white">
                              {item.value} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`${item.color} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
