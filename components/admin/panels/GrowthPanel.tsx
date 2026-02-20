'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import { GitBranch, Mail, Sparkles, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight, Target, TrendingUp, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';
import { ConversionFunnelPanel } from './ConversionFunnelPanel';
import { useComparison } from '@/components/admin/ComparisonContext';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

type SubTab = 'traffic' | 'acquisition' | 'funnel' | 'signups' | 'activation';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'traffic', label: 'Traffic', icon: Globe },
  { id: 'acquisition', label: 'Acquisition', icon: Sparkles },
  { id: 'funnel', label: 'Funnel', icon: GitBranch },
  { id: 'signups', label: 'Signups', icon: Mail },
  { id: 'activation', label: 'Activation', icon: Target },
];

interface AcquisitionData {
  totalVisitors: number;
  totalSignups: number;
  overallConversionRate: number;
  sources: {
    source: string;
    count: number;
    percentage: number;
    conversions: number;
    conversionRate: number;
  }[];
  referrers: {
    referrer: string;
    count: number;
    percentage: number;
  }[];
  dailyTrend: { date: string; visitors: number; signups: number }[];
  topChannels: { channel: string; visitors: number; trend: number }[];
  lastUpdated: string;
}

// Hook to fetch acquisition data
function useAcquisitionData(range: string = '30d', compareEnabled: boolean = false) {
  return useQuery<AcquisitionData & { previousPeriod?: { totalVisitors: number; totalSignups: number; dailyTrend: { date: string; visitors: number; signups: number }[] } }>({
    queryKey: ['admin-acquisition', range, compareEnabled ? 'compare' : 'no-compare'],
    queryFn: async () => {
      const url = compareEnabled
        ? `/api/admin/acquisition?range=${range}&compare=true`
        : `/api/admin/acquisition?range=${range}`;
      const response = await adminFetch(url);
      if (!response.ok) throw new Error('Failed to fetch acquisition data');
      const result = await response.json();
      return result.acquisition;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Acquisition Panel - shows where users come from
const AcquisitionPanel = memo(function AcquisitionPanel() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { compareEnabled } = useComparison();
  const { data, isLoading, refetch, isFetching } = useAcquisitionData(range, compareEnabled);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    previousData?: DrillDownDataPoint[];
    color?: string;
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const openDrillDown = useCallback((metric: string) => {
    if (!data) return;
    const dailyTrend = data.dailyTrend || [];
    const prevDailyTrend = data.previousPeriod?.dailyTrend;

    let chartData: DrillDownDataPoint[] = [];
    let previousChartData: DrillDownDataPoint[] | undefined;
    let title = '';
    let color = '#10b981';

    switch (metric) {
      case 'visitors':
        chartData = dailyTrend.map((d) => ({ date: d.date, value: d.visitors }));
        if (compareEnabled && prevDailyTrend) {
          previousChartData = prevDailyTrend.map((d: { date: string; visitors: number }) => ({ date: d.date, value: d.visitors }));
        }
        title = 'Total Visitors — Daily Trend';
        color = '#10b981';
        break;
      case 'signups':
        chartData = dailyTrend.map((d) => ({ date: d.date, value: d.signups }));
        if (compareEnabled && prevDailyTrend) {
          previousChartData = prevDailyTrend.map((d: { date: string; signups: number }) => ({ date: d.date, value: d.signups }));
        }
        title = 'Total Signups — Daily Trend';
        color = '#3b82f6';
        break;
      case 'conversion':
        chartData = dailyTrend.map((d) => ({
          date: d.date,
          value: d.visitors > 0 ? Math.round((d.signups / d.visitors) * 100) : 0,
        }));
        title = 'Conversion Rate — Daily %';
        color = '#a855f7';
        break;
    }

    if ((chartData?.length ?? 0) > 0) {
      setDrillDown({ isOpen: true, title, metric, data: chartData, previousData: previousChartData, color });
    }
  }, [data, compareEnabled]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalVisitors = data?.totalVisitors || 0;
  const totalSignups = data?.totalSignups || 0;
  const conversionRate = data?.overallConversionRate || 0;
  const prevPeriod = data?.previousPeriod;
  const sources = data?.sources || [];
  const referrers = data?.referrers || [];
  const dailyTrend = data?.dailyTrend || [];
  const topChannels = data?.topChannels || [];

  return (
    <div className="space-y-6">
      {/* Range Selector and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-green-600 rounded-xl p-5 text-white cursor-pointer hover:bg-green-500 transition-colors"
          onClick={() => openDrillDown('visitors')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('visitors'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Visitors</p>
              <p className="text-3xl font-bold mt-2">{totalVisitors}</p>
              {compareEnabled && prevPeriod && (
                <p className="text-green-200 text-xs mt-0.5">Previous: {prevPeriod.totalVisitors}</p>
              )}
              <p className="text-green-200 text-xs mt-1">Beta + Launch signups</p>
            </div>
            <Sparkles className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div
          className="bg-gray-800 rounded-lg p-5 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('signups')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('signups'); }}
        >
          <p className="text-sm font-medium text-gray-400">Total Signups</p>
          <p className="text-2xl font-bold text-white mt-1">{totalSignups}</p>
          {compareEnabled && prevPeriod && (
            <p className="text-xs text-gray-400 mt-0.5">Previous: {prevPeriod.totalSignups}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Registered users</p>
        </div>

        <div
          className="bg-gray-800 rounded-lg p-5 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('conversion')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('conversion'); }}
        >
          <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {conversionRate > 0 ? `${conversionRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Visitor to signup</p>
        </div>
      </div>

      {/* Sources and Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Traffic Sources</h4>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{source.source}</span>
                    {source.conversionRate > 0 && (
                      <span className="text-xs text-green-400">
                        ({source.conversionRate}% conv)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{source.count}</span>
                    <span className="text-xs text-gray-400">({source.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No source data available yet
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Referrers</h4>
          {referrers.length > 0 ? (
            <div className="space-y-3">
              {referrers.slice(0, 6).map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-400 truncate max-w-[150px]">
                      {ref.referrer}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{ref.count}</span>
                    <span className="text-xs text-gray-400">({ref.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No referrer data yet. Referrers appear when users arrive from external links.
            </p>
          )}
        </div>
      </div>

      {/* Top Channels */}
      {topChannels.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Channel Performance</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topChannels.map((channel, idx) => (
              <div key={idx} className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-400">{channel.channel}</p>
                <p className="text-xl font-bold text-white mt-1">{channel.visitors}</p>
                {channel.trend !== 0 && (
                  <div className={`flex items-center gap-1 mt-1 ${channel.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {channel.trend > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span className="text-xs">{Math.abs(channel.trend)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Daily Acquisition Trend</h4>
          <div className="h-32 flex items-end gap-1">
            {dailyTrend.slice(-14).map((day, i) => {
              const maxVisitors = dailyTrend.length > 0 ? Math.max(...dailyTrend.map(d => d.visitors), 1) : 1;
              const height = (day.visitors / maxVisitors) * 100;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.visitors} visitors, ${day.signups} signups`}>
                  <div
                    className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{dailyTrend.length > 14 ? dailyTrend[dailyTrend.length - 14]?.date : dailyTrend[0]?.date}</span>
            <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {totalVisitors === 0 && (
        <div className="p-4 bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Early Stage:</strong> Acquisition data will populate as visitors sign up for beta or launch notifications.
            Source tracking is captured from the source field in beta requests and launch notifications.
          </p>
        </div>
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle={`Last ${range === '7d' ? '7' : range === '30d' ? '30' : '90'} days`}
      >
        <DrillDownChart
          data={drillDown.data}
          previousData={drillDown.previousData}
          metric={drillDown.metric}
          color={drillDown.color}
        />
      </DrillDownModal>
    </div>
  );
});

// Signups Panel
const SignupsPanel = memo(function SignupsPanel() {
  return <NotificationsPanel />;
});

// Activation Funnel Panel
const ActivationFunnelPanel = memo(function ActivationFunnelPanel() {
  const { data: lifecycleData, isLoading } = useQuery({
    queryKey: ['admin-user-lifecycle'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/user-lifecycle');
      if (!response.ok) throw new Error('Failed to fetch');
      return (await response.json()).lifecycle;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: _businessMetrics } = useQuery({
    queryKey: ['admin-business-metrics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/business-metrics');
      if (!response.ok) throw new Error('Failed to fetch');
      return (await response.json()).metrics;
    },
    staleTime: 5 * 60 * 1000,
  });

  const funnelSteps = useMemo(() => {
    if (!lifecycleData) return [];
    const s = lifecycleData.stages;
    const total = lifecycleData.total;
    const activated = s.activated + s.engaged + s.power_user;
    const engaged = s.engaged + s.power_user;
    return [
      { label: 'Signed Up', count: total, pct: 100 },
      { label: 'Created Space', count: activated, pct: total > 0 ? Math.round((activated / total) * 100) : 0 },
      { label: 'Engaged (7d)', count: engaged, pct: total > 0 ? Math.round((engaged / total) * 100) : 0 },
      { label: 'Power User', count: s.power_user, pct: total > 0 ? Math.round((s.power_user / total) * 100) : 0 },
    ];
  }, [lifecycleData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading activation data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Funnel Visualization */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Activation Funnel</h3>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{step.label}</span>
                <span className="text-sm font-medium text-white">{step.count} ({step.pct}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CAC Card */}
      <div className="bg-gray-800 rounded-lg p-5 border border-green-500/20">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Customer Acquisition Cost</h4>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-md">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-green-400">Organic</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-3xl font-bold text-green-400">$0</p>
          <span className="text-sm text-gray-400">CAC</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Signups</span>
            <span className="font-medium text-white">{lifecycleData?.total || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Acquisition Method</span>
            <span className="font-medium text-green-400">100% Organic</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Infinite ROI — all growth is organic. CAC tracking will activate when paid campaigns are configured.
          </p>
        </div>
      </div>

      {/* Viral Metrics Placeholder */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h4 className="text-sm font-semibold text-white mb-2">Viral Coefficient (K-factor)</h4>
        <p className="text-sm text-gray-400">K-factor tracking available when invite system is used</p>
      </div>
    </div>
  );
});

// ─── Traffic Panel ───────────────────────────────────────────────────────────

interface VisitorAnalyticsData {
  uniqueVisitors: number;
  totalPageViews: number;
  pagesPerVisit: number;
  topPages: { path: string; views: number; uniqueVisitors: number }[];
  topReferrers: { referrer: string; count: number; percentage: number }[];
  topUtmSources: { source: string; count: number; percentage: number }[];
  deviceBreakdown: { type: string; count: number; percentage: number }[];
  countryBreakdown: { country: string; count: number; percentage: number }[];
  dailyTrend: { date: string; uniqueVisitors: number; pageViews: number }[];
  signupConversionRate: number;
  totalSignups: number;
  previousPeriod?: {
    uniqueVisitors: number;
    totalPageViews: number;
    totalSignups: number;
    dailyTrend: { date: string; uniqueVisitors: number; pageViews: number }[];
  };
  lastUpdated: string;
}

function useVisitorAnalytics(range: string = '30d', compareEnabled: boolean = false) {
  return useQuery<VisitorAnalyticsData>({
    queryKey: ['admin-visitor-analytics', range, compareEnabled ? 'compare' : 'no-compare'],
    queryFn: async () => {
      const url = compareEnabled
        ? `/api/admin/visitor-analytics?range=${range}&compare=true`
        : `/api/admin/visitor-analytics?range=${range}`;
      const response = await adminFetch(url);
      if (!response.ok) throw new Error('Failed to fetch visitor analytics');
      const result = await response.json();
      return result.visitorAnalytics;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

const TrafficPanel = memo(function TrafficPanel() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { compareEnabled } = useComparison();
  const { data, isLoading, refetch, isFetching } = useVisitorAnalytics(range, compareEnabled);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    previousData?: DrillDownDataPoint[];
    color?: string;
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const openDrillDown = useCallback((metric: string) => {
    if (!data) return;
    const dailyTrend = data.dailyTrend || [];
    const prevDailyTrend = data.previousPeriod?.dailyTrend;

    let chartData: DrillDownDataPoint[] = [];
    let previousChartData: DrillDownDataPoint[] | undefined;
    let title = '';
    let color = '#8b5cf6';

    switch (metric) {
      case 'visitors':
        chartData = dailyTrend.map(d => ({ date: d.date, value: d.uniqueVisitors }));
        if (compareEnabled && prevDailyTrend) {
          previousChartData = prevDailyTrend.map(d => ({ date: d.date, value: d.uniqueVisitors }));
        }
        title = 'Unique Visitors — Daily Trend';
        color = '#8b5cf6';
        break;
      case 'pageviews':
        chartData = dailyTrend.map(d => ({ date: d.date, value: d.pageViews }));
        if (compareEnabled && prevDailyTrend) {
          previousChartData = prevDailyTrend.map(d => ({ date: d.date, value: d.pageViews }));
        }
        title = 'Page Views — Daily Trend';
        color = '#3b82f6';
        break;
    }

    if ((chartData?.length ?? 0) > 0) {
      setDrillDown({ isOpen: true, title, metric, data: chartData, previousData: previousChartData, color });
    }
  }, [data, compareEnabled]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const uniqueVisitors = data?.uniqueVisitors || 0;
  const totalPageViews = data?.totalPageViews || 0;
  const pagesPerVisit = data?.pagesPerVisit || 0;
  const conversionRate = data?.signupConversionRate || 0;
  const totalSignups = data?.totalSignups || 0;
  const prevPeriod = data?.previousPeriod;
  const topPages = data?.topPages || [];
  const topReferrers = data?.topReferrers || [];
  const topUtmSources = (data?.topUtmSources || []).filter(s => s.source !== 'none');
  const deviceBreakdown = data?.deviceBreakdown || [];
  const countryBreakdown = data?.countryBreakdown || [];
  const dailyTrend = data?.dailyTrend || [];

  // Compute trend percentages when comparison data available
  const visitorTrend = prevPeriod && prevPeriod.uniqueVisitors > 0
    ? Math.round(((uniqueVisitors - prevPeriod.uniqueVisitors) / prevPeriod.uniqueVisitors) * 100)
    : undefined;
  const pageViewTrend = prevPeriod && prevPeriod.totalPageViews > 0
    ? Math.round(((totalPageViews - prevPeriod.totalPageViews) / prevPeriod.totalPageViews) * 100)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Range Selector and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="bg-purple-600 rounded-xl p-5 text-white cursor-pointer hover:bg-purple-500 transition-colors"
          onClick={() => openDrillDown('visitors')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('visitors'); }}
        >
          <p className="text-purple-100 text-sm">Unique Visitors</p>
          <p className="text-3xl font-bold mt-2">{uniqueVisitors.toLocaleString()}</p>
          {visitorTrend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${visitorTrend >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {visitorTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span className="text-xs">{Math.abs(visitorTrend)}% vs prev</span>
            </div>
          )}
        </div>

        <div
          className="bg-gray-800 rounded-xl p-5 cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('pageviews')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('pageviews'); }}
        >
          <p className="text-sm font-medium text-gray-400">Page Views</p>
          <p className="text-2xl font-bold text-white mt-1">{totalPageViews.toLocaleString()}</p>
          {pageViewTrend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${pageViewTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {pageViewTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span className="text-xs">{Math.abs(pageViewTrend)}%</span>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400">Pages / Visit</p>
          <p className="text-2xl font-bold text-white mt-1">{pagesPerVisit}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {conversionRate > 0 ? `${conversionRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalSignups} signups</p>
        </div>
      </div>

      {/* Daily Trend Bar Chart */}
      {dailyTrend.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Daily Visitors</h4>
          <div className="h-32 flex items-end gap-1">
            {dailyTrend.slice(-14).map((day, i) => {
              const maxVisitors = Math.max(...dailyTrend.slice(-14).map(d => d.uniqueVisitors), 1);
              const height = (day.uniqueVisitors / maxVisitors) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.uniqueVisitors} visitors, ${day.pageViews} views`}>
                  <div
                    className="w-full bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{dailyTrend.length > 14 ? dailyTrend[dailyTrend.length - 14]?.date : dailyTrend[0]?.date}</span>
            <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Top Referrers and UTM Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Referrers</h4>
          {topReferrers.length > 0 ? (
            <div className="space-y-3">
              {topReferrers.slice(0, 8).map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-300 truncate max-w-[180px]">{ref.referrer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{ref.count}</span>
                    <span className="text-xs text-gray-400">({ref.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No referrer data yet</p>
          )}
        </div>

        {topUtmSources.length > 0 ? (
          <div className="bg-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-white mb-4">UTM Sources</h4>
            <div className="space-y-3">
              {topUtmSources.slice(0, 8).map((utm, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 truncate max-w-[180px]">{utm.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{utm.count}</span>
                    <span className="text-xs text-gray-400">({utm.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-white mb-4">UTM Sources</h4>
            <p className="text-sm text-gray-400 italic">
              No UTM data yet. Add <code className="text-purple-400">?utm_source=reddit</code> to your shared links to track campaigns.
            </p>
          </div>
        )}
      </div>

      {/* Top Pages */}
      {topPages.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Pages</h4>
          <div className="space-y-3">
            {topPages.map((page, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-mono truncate max-w-[250px]">{page.path}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-white">{page.views} <span className="text-gray-400 text-xs">views</span></span>
                  <span className="text-sm text-gray-400">{page.uniqueVisitors} <span className="text-xs">unique</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device & Country Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deviceBreakdown.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-white mb-4">Device Breakdown</h4>
            <div className="space-y-3">
              {deviceBreakdown.map((device, idx) => {
                const DeviceIcon = DEVICE_ICONS[device.type] || Monitor;
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DeviceIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300 capitalize">{device.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-purple-500" style={{ width: `${device.percentage}%` }} />
                      </div>
                      <span className="text-sm font-medium text-white w-10 text-right">{device.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {countryBreakdown.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-white mb-4">Top Countries</h4>
            <div className="space-y-3">
              {countryBreakdown.slice(0, 8).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{c.country}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{c.count}</span>
                    <span className="text-xs text-gray-400">({c.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {uniqueVisitors === 0 && (
        <div className="p-4 bg-purple-900/20 rounded-lg">
          <p className="text-sm text-purple-300">
            <strong>Getting started:</strong> Visitor tracking is now active. Data will appear as people visit your site.
            Share links with UTM parameters to track where traffic comes from:
          </p>
          <code className="text-xs text-purple-400 mt-2 block">
            rowanapp.com?utm_source=reddit&utm_medium=social&utm_campaign=launch
          </code>
        </div>
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle={`Last ${range === '7d' ? '7' : range === '30d' ? '30' : '90'} days`}
      >
        <DrillDownChart
          data={drillDown.data}
          previousData={drillDown.previousData}
          metric={drillDown.metric}
          color={drillDown.color}
        />
      </DrillDownModal>
    </div>
  );
});

/** Renders user growth metrics, signup trends, and acquisition data. */
export const GrowthPanel = memo(function GrowthPanel() {
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
                  ? 'border-green-500 text-green-400'
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
        {activeSubTab === 'traffic' && <TrafficPanel />}
        {activeSubTab === 'acquisition' && <AcquisitionPanel />}
        {activeSubTab === 'funnel' && <ConversionFunnelPanel />}
        {activeSubTab === 'signups' && <SignupsPanel />}
        {activeSubTab === 'activation' && <ActivationFunnelPanel />}
      </div>
    </div>
  );
});
