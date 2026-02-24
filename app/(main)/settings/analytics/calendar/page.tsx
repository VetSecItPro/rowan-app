'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { calendarService } from '@/lib/services/calendar-service';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface EventStatsData {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export default function CalendarAnalyticsPage() {
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [stats, setStats] = useState<EventStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!spaceId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await calendarService.getEventStats(spaceId);
        setStats(data);
      } catch (err) {
        logger.error('Failed to load calendar stats:', err, { component: 'page', action: 'execution' });
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

  return (
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Settings', href: '/settings' },
        { label: 'Analytics', href: '/settings/analytics' },
        { label: 'Calendar & Events' },
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 mb-2">
              Calendar & Events Analytics
            </h1>
            <p className="text-gray-400">
              Analyze your scheduling patterns and event attendance
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-400">Loading analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasData ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto h-16 w-16 text-purple-400/40 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">
              Start using Calendar to see analytics here
            </p>
            <Link
              href="/calendar"
              className="inline-flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Go to Calendar
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.total}</h3>
                <p className="text-sm text-gray-400">Total Events</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.today}</h3>
                <p className="text-sm text-gray-400">Events Today</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.thisWeek}</h3>
                <p className="text-sm text-gray-400">This Week</p>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{stats.thisMonth}</h3>
                <p className="text-sm text-gray-400">This Month</p>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-100 mb-4">Event Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
                  <p className="text-sm text-purple-300">Total Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.today}</p>
                  <p className="text-sm text-blue-300">Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.thisWeek}</p>
                  <p className="text-sm text-green-300">This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-400">{stats.thisMonth}</p>
                  <p className="text-sm text-indigo-300">This Month</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
