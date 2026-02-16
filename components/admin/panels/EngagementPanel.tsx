'use client';

import { useState, memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import { Eye, Layers, Clock, MousePointer, RefreshCw, Grid3X3 } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { FeatureUsagePanel } from './FeatureUsagePanel';

type SubTab = 'traffic' | 'features' | 'sessions' | 'adoption';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'traffic', label: 'Traffic', icon: Eye },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'sessions', label: 'Sessions', icon: Clock },
  { id: 'adoption', label: 'Adoption', icon: Grid3X3 },
];

// ---------------------------------------------------------------------------
// Adoption Panel — Feature Adoption Matrix
// ---------------------------------------------------------------------------

interface EngagementScoreData {
  avgScore: number;
  distribution: { label: string; count: number; pct: number }[];
  features: {
    feature: string;
    triedItPct: number;
    weeklyActivePct: number;
    dailyActivePct: number;
  }[];
  sessions?: {
    avgDurationMinutes: number;
  };
}

const AdoptionPanel = memo(function AdoptionPanel() {
  const { data, isLoading } = useQuery<EngagementScoreData>({
    queryKey: ['admin-engagement-scores'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/engagement-scores');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()).engagement;
    },
    staleTime: 5 * 60 * 1000,
  });

  const features = data?.features;
  const sortedFeatures = useMemo(() => {
    if (!features) return [];
    return [...features].sort((a, b) => b.triedItPct - a.triedItPct);
  }, [features]);

  const getCellColor = (pct: number) => {
    if (pct > 30) return 'text-green-400 bg-green-900/20';
    if (pct >= 15) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-red-400 bg-red-900/20';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading adoption data...</span>
      </div>
    );
  }

  const avgScore = data?.avgScore ?? 0;
  const distribution = data?.distribution ?? [];

  return (
    <div className="space-y-6">
      {/* Top Row — Score + Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Average Engagement Score */}
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-gray-400">Average Engagement Score</span>
          </div>
          <p className="text-4xl font-bold text-white">{avgScore.toFixed(1)}</p>
          <p className="text-xs text-gray-400 mt-1">Across all active users</p>
        </div>

        {/* Score Distribution */}
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-400">Score Distribution</span>
          </div>
          {distribution.length > 0 ? (
            <div className="space-y-2">
              {distribution.map((seg) => (
                <div key={seg.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{seg.label}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(seg.pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-12 text-right">{seg.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No distribution data available</p>
          )}
        </div>
      </div>

      {/* Feature Adoption Matrix */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-white">Feature Adoption Matrix</h3>
        </div>

        {sortedFeatures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-3 pr-4">Feature</th>
                  <th className="pb-3 px-2 text-center">Tried It (%)</th>
                  <th className="pb-3 px-2 text-center">Weekly Active (%)</th>
                  <th className="pb-3 px-2 text-center">Daily Active (%)</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {sortedFeatures.map((feat) => (
                  <tr key={feat.feature} className="border-t border-gray-700">
                    <td className="py-3 pr-4 font-medium capitalize">
                      {feat.feature.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCellColor(feat.triedItPct)}`}>
                        {feat.triedItPct}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCellColor(feat.weeklyActivePct)}`}>
                        {feat.weeklyActivePct}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCellColor(feat.dailyActivePct)}`}>
                        {feat.dailyActivePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No feature adoption data yet</p>
            <p className="text-xs mt-1">Data will appear as users interact with features</p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-900/40 inline-block" /> &gt;30% — Strong</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-900/40 inline-block" /> 15-30% — Moderate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/40 inline-block" /> &lt;15% — Low</span>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Sessions Panel - shows session-level analytics
// ---------------------------------------------------------------------------

const SessionsPanel = memo(function SessionsPanel() {
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics', '30d'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/analytics?range=30d');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      return result.analytics;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch engagement-scores for session duration
  const { data: engagementData } = useQuery<EngagementScoreData>({
    queryKey: ['admin-engagement-scores'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/engagement-scores');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()).engagement;
    },
    staleTime: 5 * 60 * 1000,
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

  const avgDuration = engagementData?.sessions?.avgDurationMinutes;
  const hasDuration = avgDuration !== undefined && avgDuration > 0;

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
          <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-400">Pages per Session</span>
          </div>
          <p className="text-3xl font-bold text-white">{trafficMetrics.avgPagesPerSession}</p>
          <p className="text-xs text-gray-400 mt-1">Average</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">Avg. Session Duration</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {hasDuration ? `${avgDuration.toFixed(1)} min` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {hasDuration ? 'From engagement data' : 'Insufficient data'}
          </p>
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

/** Displays user engagement metrics and activity patterns in the admin dashboard. */
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
        {activeSubTab === 'adoption' && <AdoptionPanel />}
      </div>
    </div>
  );
});
