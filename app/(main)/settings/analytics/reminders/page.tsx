'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { remindersService } from '@/lib/services/reminders-service';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface ReminderStatsData {
  total: number;
  active: number;
  completed: number;
  overdue: number;
}

export default function RemindersAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [stats, setStats] = useState<ReminderStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await remindersService.getReminderStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load reminder stats:', err, { component: 'page', action: 'execution' });
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
        { label: 'Reminders' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-pink-400 mb-2">
              Reminders Analytics
            </h1>
            <p className="text-gray-400">
              Monitor reminder effectiveness and completion patterns
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <Bell className="mx-auto h-16 w-16 text-pink-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Reminders to see analytics here
            </p>
            <Link
              href="/reminders"
              className="inline-flex items-center px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Go to Reminders
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{completionRate}%</h3>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-400">
                    {stats.active} active
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.total}</h3>
                <p className="text-sm text-gray-400">Total Reminders</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-400">
                    +{stats.completed}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.completed}</h3>
                <p className="text-sm text-gray-400">Completed</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  {stats.overdue > 0 && (
                    <span className="text-sm font-medium text-red-400">
                      Needs attention
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.overdue}</h3>
                <p className="text-sm text-gray-400">Overdue</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Status Breakdown
                  </h3>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Active', value: stats.active, color: 'bg-pink-500' },
                    { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
                    { label: 'Overdue', value: stats.overdue, color: 'bg-red-500' },
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

              {/* Summary */}
              <div className="bg-gradient-to-r from-pink-900/20 to-purple-900/20 border border-pink-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-pink-100 mb-4">Reminder Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-400">{stats.total}</p>
                    <p className="text-sm text-pink-300">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                    <p className="text-sm text-green-300">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
                    <p className="text-sm text-blue-300">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                    <p className="text-sm text-red-300">Overdue</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
