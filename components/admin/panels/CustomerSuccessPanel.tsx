'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  HeartHandshake,
  ThumbsUp,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Users,
  RefreshCw,
} from 'lucide-react';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

type SubTab = 'feedback' | 'health' | 'requests';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'feedback', label: 'AI Feedback', icon: ThumbsUp },
  { id: 'health', label: 'Engagement Health', icon: TrendingUp },
  { id: 'requests', label: 'Feature Requests', icon: MessageSquare },
];

interface EngagementScoreData {
  distribution: {
    excellent: number;
    good: number;
    average: number;
    low: number;
    inactive: number;
  };
  averageScore: number;
  totalUsers: number;
}

interface LifecycleData {
  atRisk: number;
}

// --- Sub-panel: AI Feedback ---

const AIFeedbackPanel = memo(function AIFeedbackPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery<EngagementScoreData>({
    queryKey: ['admin-ai-feedback'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/engagement-scores');
      if (!response.ok) throw new Error('Failed to fetch engagement scores');
      const result = await response.json();
      return result.engagement;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const totalUsers = data?.totalUsers || 0;
  const excellent = data?.distribution?.excellent || 0;
  const good = data?.distribution?.good || 0;
  const average = data?.distribution?.average || 0;
  const low = data?.distribution?.low || 0;
  const inactive = data?.distribution?.inactive || 0;

  // Map engagement scores to engagement health categories
  const highlyEngaged = excellent + good;
  const moderateEngaged = average;
  const atRiskEngaged = low + inactive;

  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const openDrillDown = useCallback((metric: string) => {
    if (metric === 'engagement') {
      const chartData: DrillDownDataPoint[] = [
        { date: 'Highly Engaged', value: highlyEngaged },
        { date: 'Moderate', value: moderateEngaged },
        { date: 'At Risk', value: atRiskEngaged },
      ];
      setDrillDown({
        isOpen: true,
        title: 'Engagement Distribution',
        metric: 'Users',
        data: chartData,
        color: '#f43f5e',
        chartType: 'bar',
      });
    }
  }, [highlyEngaged, moderateEngaged, atRiskEngaged]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading feedback data...</span>
      </div>
    );
  }
  const totalCounted = highlyEngaged + moderateEngaged + atRiskEngaged;
  const highPct = totalCounted > 0 ? Math.round((highlyEngaged / totalCounted) * 100) : 0;
  const moderatePct = totalCounted > 0 ? Math.round((moderateEngaged / totalCounted) * 100) : 0;
  const atRiskPct = totalCounted > 0 ? 100 - highPct - moderatePct : 0;

  return (
    <div className="space-y-6">
      {/* Engagement Health Distribution */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">Engagement Health Distribution</h3>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => openDrillDown('engagement')}
            className="text-center hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 rounded-lg p-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-2xl font-bold text-green-400">{highlyEngaged}</span>
            </div>
            <p className="text-xs text-gray-400">Highly Engaged ({highPct}%)</p>
          </button>
          <button
            onClick={() => openDrillDown('engagement')}
            className="text-center hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 rounded-lg p-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <HeartHandshake className="w-4 h-4 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{moderateEngaged}</span>
            </div>
            <p className="text-xs text-gray-400">Moderate ({moderatePct}%)</p>
          </button>
          <button
            onClick={() => openDrillDown('engagement')}
            className="text-center hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 rounded-lg p-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-2xl font-bold text-red-400">{atRiskEngaged}</span>
            </div>
            <p className="text-xs text-gray-400">At Risk ({atRiskPct}%)</p>
          </button>
        </div>

        {/* Horizontal ratio bar */}
        {totalCounted > 0 ? (
          <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${highPct}%` }}
            />
            <div
              className="bg-yellow-500 transition-all duration-500"
              style={{ width: `${moderatePct}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${atRiskPct}%` }}
            />
          </div>
        ) : (
          <div className="h-4 bg-gray-700 rounded-full" />
        )}

        <p className="text-xs text-gray-500 mt-2">
          Based on engagement score distribution ({totalUsers} total users)
        </p>
      </div>

      {/* Total Feedback Count */}
      <button
        onClick={() => openDrillDown('engagement')}
        className="w-full bg-gray-800 rounded-lg p-5 text-left hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-medium text-gray-400">Total Users Assessed</span>
        </div>
        <p className="text-3xl font-bold text-white">{totalUsers}</p>
        <p className="text-xs text-gray-400 mt-1">Users with engagement scores &middot; Click to drill down</p>
      </button>

      {/* Feedback Coming Soon */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="p-4 bg-rose-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-rose-300" />
            <h4 className="text-sm font-medium text-rose-300">Feedback Data Aggregation Coming Soon</h4>
          </div>
          <p className="text-xs text-rose-400">
            AI feedback sentiment (thumbs up/down) will be added when sufficient feedback data is collected
            from the <code className="bg-gray-700 px-1 py-0.5 rounded text-rose-300">ai_messages.feedback</code> column.
            The above chart shows actual engagement score distribution.
          </p>
        </div>
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
      >
        <DrillDownChart
          data={drillDown.data}
          metric={drillDown.metric}
          color={drillDown.color}
          chartType={drillDown.chartType}
        />
      </DrillDownModal>
    </div>
  );
});

// --- Sub-panel: Engagement Health ---

const SCORE_SEGMENTS = [
  { key: 'excellent', label: 'Excellent', range: '80-100', color: 'bg-green-500', textColor: 'text-green-400' },
  { key: 'good', label: 'Good', range: '60-79', color: 'bg-green-400', textColor: 'text-green-400' },
  { key: 'average', label: 'Average', range: '40-59', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  { key: 'low', label: 'Low', range: '20-39', color: 'bg-red-400', textColor: 'text-red-400' },
  { key: 'inactive', label: 'Inactive', range: '0-19', color: 'bg-red-600', textColor: 'text-red-400' },
] as const;

const EngagementHealthPanel = memo(function EngagementHealthPanel() {
  const { data: engagementData, isLoading: engagementLoading, refetch, isFetching } = useQuery<EngagementScoreData>({
    queryKey: ['admin-engagement-health'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/engagement-scores');
      if (!response.ok) throw new Error('Failed to fetch engagement scores');
      const result = await response.json();
      return result.engagement;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: lifecycleData, isLoading: lifecycleLoading } = useQuery<LifecycleData>({
    queryKey: ['admin-lifecycle-at-risk'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/user-lifecycle');
      if (!response.ok) throw new Error('Failed to fetch lifecycle data');
      const result = await response.json();
      return { atRisk: result.lifecycle?.atRisk || 0 };
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = engagementLoading || lifecycleLoading;

  const distribution = engagementData?.distribution || { excellent: 0, good: 0, average: 0, low: 0, inactive: 0 };
  const averageScore = engagementData?.averageScore || 0;
  const totalUsers = engagementData?.totalUsers || 0;
  const atRiskUsers = lifecycleData?.atRisk || 0;

  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const openDrillDown = useCallback((metric: string) => {
    switch (metric) {
      case 'scoreDistribution': {
        const chartData = SCORE_SEGMENTS.map(seg => ({
          date: seg.label,
          value: distribution[seg.key] || 0,
        }));
        setDrillDown({
          isOpen: true,
          title: 'Engagement Score Distribution',
          metric: 'Users',
          data: chartData,
          color: '#f43f5e',
          chartType: 'bar',
        });
        break;
      }
    }
  }, [distribution]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading engagement health...</span>
      </div>
    );
  }

  const maxSegment = Math.max(
    distribution.excellent,
    distribution.good,
    distribution.average,
    distribution.low,
    distribution.inactive,
    1
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => openDrillDown('scoreDistribution')}
          className="bg-gray-800 rounded-lg p-5 text-left hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-gray-400">Average Engagement Score</span>
          </div>
          <p className={`text-4xl font-bold ${
            averageScore >= 60 ? 'text-green-400' : averageScore >= 40 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {averageScore}
          </p>
          <p className="text-xs text-gray-400 mt-1">Out of 100 &middot; Click to drill down</p>
        </button>

        <button
          onClick={() => openDrillDown('scoreDistribution')}
          className="bg-gray-800 rounded-lg p-5 text-left hover:bg-gray-750 hover:ring-1 hover:ring-rose-500/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-400">Total Users Scored</span>
          </div>
          <p className="text-4xl font-bold text-white">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-1">With engagement data &middot; Click to drill down</p>
        </button>

        <button
          onClick={() => openDrillDown('scoreDistribution')}
          className="bg-gray-800 rounded-lg p-5 text-left hover:bg-gray-750 hover:ring-1 hover:ring-orange-500/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium text-gray-400">At-Risk Users</span>
          </div>
          <p className={`text-4xl font-bold ${atRiskUsers > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {atRiskUsers}
          </p>
          <p className="text-xs text-gray-400 mt-1">May need re-engagement &middot; Click to drill down</p>
        </button>
      </div>

      {/* Score Distribution */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-semibold text-white">Score Distribution</h3>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3">
          {SCORE_SEGMENTS.map((segment) => {
            const count = distribution[segment.key] || 0;
            const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
            const barWidth = maxSegment > 0 ? Math.round((count / maxSegment) * 100) : 0;

            return (
              <div key={segment.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={segment.textColor}>
                    {segment.label} <span className="text-gray-500 text-xs">({segment.range})</span>
                  </span>
                  <span className="text-gray-400">
                    {count} user{count !== 1 ? 's' : ''} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${segment.color}`}
                    style={{ width: `${Math.max(barWidth, count > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Legend */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Health Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-green-900/20 rounded-lg">
            <p className="text-sm font-medium text-green-400">Healthy</p>
            <p className="text-xs text-green-300 mt-1">Score 60+. Users are actively engaging with the app.</p>
          </div>
          <div className="p-3 bg-yellow-900/20 rounded-lg">
            <p className="text-sm font-medium text-yellow-400">Needs Attention</p>
            <p className="text-xs text-yellow-300 mt-1">Score 40-59. Moderate engagement, may benefit from nudges.</p>
          </div>
          <div className="p-3 bg-red-900/20 rounded-lg">
            <p className="text-sm font-medium text-red-400">At Risk</p>
            <p className="text-xs text-red-300 mt-1">Score below 40. Low activity, consider re-engagement campaigns.</p>
          </div>
        </div>
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
      >
        <DrillDownChart
          data={drillDown.data}
          metric={drillDown.metric}
          color={drillDown.color}
          chartType={drillDown.chartType}
        />
      </DrillDownModal>
    </div>
  );
});

// --- Sub-panel: Feature Requests ---

const FeatureRequestsPanel = memo(function FeatureRequestsPanel() {
  return (
    <div className="space-y-6">
      {/* Coming Soon Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-6">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-semibold text-white mb-2">Feature Request Tracking Coming Soon</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            AI chat conversations can be analyzed for feature requests using the <code className="bg-gray-700 px-1.5 py-0.5 rounded text-rose-300 text-xs">ai_messages</code> table.
            This panel will aggregate and categorize user requests automatically.
          </p>
        </div>
      </div>

      {/* Suggestion Card */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="p-4 bg-rose-900/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake className="w-4 h-4 text-rose-300" />
            <h4 className="text-sm font-medium text-rose-300">Recommendation</h4>
          </div>
          <p className="text-xs text-rose-400">
            Consider adding a feedback form to the app to collect structured feature requests directly from users.
            This would complement the AI chat analysis with explicit user input.
          </p>
        </div>
      </div>

      {/* Planned Features */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Planned Capabilities</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-3 h-3 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">AI Conversation Analysis</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Parse AI chat messages for feature-related keywords and sentiment to auto-categorize requests.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-3 h-3 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">Request Trending</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Track which feature requests are mentioned most frequently over time.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-rose-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ThumbsUp className="w-3 h-3 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">User Voting</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Allow users to upvote feature requests to surface the most desired improvements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/** Displays customer success metrics including AI feedback sentiment, engagement health scores, and feature request tracking. */
export const CustomerSuccessPanel = memo(function CustomerSuccessPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('feedback');

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
                  ? 'border-rose-500 text-rose-400'
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
        {activeSubTab === 'feedback' && <AIFeedbackPanel />}
        {activeSubTab === 'health' && <EngagementHealthPanel />}
        {activeSubTab === 'requests' && <FeatureRequestsPanel />}
      </div>
    </div>
  );
});
