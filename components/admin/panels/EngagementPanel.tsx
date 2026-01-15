'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Layers, Clock, MousePointer, RefreshCw } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { FeatureUsagePanel } from './FeatureUsagePanel';

type SubTab = 'traffic' | 'features' | 'sessions';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'traffic', label: 'Traffic', icon: Eye },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'sessions', label: 'Sessions', icon: Clock },
];

// Sessions Panel - shows session-level analytics
const SessionsPanel = memo(function SessionsPanel() {
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics', '30d'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics?range=30d');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      return result.analytics;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading session data...</span>
      </div>
    );
  }

  const trafficMetrics = analyticsData?.trafficMetrics || {
    totalPageViews: 0,
    uniqueSessions: 0,
    avgPagesPerSession: 0,
  };

  const hourlyActivity = analyticsData?.hourlyActivity || [];
  const maxHourly = Math.max(...hourlyActivity, 1);

  return (
    <div className="space-y-6">
      {/* Session Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-gray-400">Total Sessions</span>
          </div>
          <p className="text-3xl font-bold text-white">{trafficMetrics.uniqueSessions}</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-400">Pages per Session</span>
          </div>
          <p className="text-3xl font-bold text-white">{trafficMetrics.avgPagesPerSession}</p>
          <p className="text-xs text-gray-500 mt-1">Average</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">Avg. Session Duration</span>
          </div>
          <p className="text-3xl font-bold text-white">--</p>
          <p className="text-xs text-gray-500 mt-1">Coming soon</p>
        </div>
      </div>

      {/* Session Activity by Hour */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-white">Activity by Hour (UTC)</h3>
          </div>
          <button
            onClick={() => refetch()}
            className="text-gray-400 hover:text-gray-300"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {hourlyActivity.length > 0 ? (
          <div className="space-y-2">
            <div className="h-32 flex items-end gap-1">
              {hourlyActivity.map((count: number, hour: number) => {
                const height = (count / maxHourly) * 100;
                return (
                  <div
                    key={hour}
                    className="flex-1 bg-purple-500 rounded-t transition-all duration-300 opacity-70 hover:opacity-100 cursor-pointer"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${hour}:00 - ${count} events`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>11pm</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No hourly data available</p>
        )}
      </div>

      {/* Session Insights */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Session Insights</h3>

        <div className="space-y-4">
          <div className="p-4 bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300">Session Duration Tracking</h4>
            <p className="text-xs text-blue-400 mt-1">
              Average session duration will be calculated as more user activity is tracked. This requires measuring time between first and last action in each session.
            </p>
          </div>

          <div className="p-4 bg-purple-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-purple-300">Bounce Rate</h4>
            <p className="text-xs text-purple-400 mt-1">
              Bounce rate (single-page sessions) will be available once we have more session data. Currently tracking {trafficMetrics.uniqueSessions} sessions.
            </p>
          </div>

          <div className="p-4 bg-green-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-green-300">Return Visitors</h4>
            <p className="text-xs text-green-400 mt-1">
              Return visitor tracking compares returning session IDs vs new ones. This will be calculated as session history grows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export const EngagementPanel = memo(function EngagementPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('traffic');

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-700">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === 'traffic' && <AnalyticsPanel />}
        {activeSubTab === 'features' && <FeatureUsagePanel />}
        {activeSubTab === 'sessions' && <SessionsPanel />}
      </div>
    </div>
  );
});
