'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Monitor,
  Globe,
  RefreshCw,
  Activity,
  MousePointer,
  Layers,
} from 'lucide-react';
import { useComparison } from '@/components/admin/ComparisonContext';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

interface TrafficMetrics {
  totalPageViews: number;
  totalEventsAllTime: number;
  uniqueSessions: number;
  uniqueUsers: number;
  avgPagesPerSession: number;
}

interface DeviceBreakdown {
  [key: string]: string | number;
  device: string;
  count: number;
  percentage: number;
}

interface BrowserBreakdown {
  [key: string]: string | number;
  browser: string;
  count: number;
  percentage: number;
}

interface OsBreakdown {
  [key: string]: string | number;
  os: string;
  count: number;
  percentage: number;
}

interface TopPage {
  page: string;
  views: number;
  percentage: number;
}

interface AnalyticsData {
  summary: {
    totalUsers: number;
    totalNotifications: number;
    totalBetaRequests: number;
    activeBetaUsers: number;
    growthRate: number;
    churnRate: number;
    totalPageViews: number;
    uniqueVisitors: number;
  };
  trafficMetrics: TrafficMetrics;
  trafficTrends: Array<{ date: string; pageViews: number }>;
  deviceBreakdown: DeviceBreakdown[];
  browserBreakdown: BrowserBreakdown[];
  osBreakdown: OsBreakdown[];
  topPages: TopPage[];
  hourlyActivity: number[];
  betaMetrics: {
    conversionRate: number;
    approvalRate: number;
    retentionRate: number;
    averageActivityScore: number;
  };
  userGrowth: Array<{ date: string; users: number }>;
}

// Metric Card Component
const MetricCard = memo(function MetricCard({
  title,
  value,
  previousValue,
  subtitle,
  icon: Icon,
  color = 'cyan',
  onClick,
}: {
  title: string;
  value: string | number;
  previousValue?: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'cyan' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  onClick?: () => void;
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    cyan: { bg: 'bg-cyan-500', icon: 'text-cyan-500' },
    blue: { bg: 'bg-blue-500', icon: 'text-blue-500' },
    green: { bg: 'bg-green-500', icon: 'text-green-500' },
    purple: { bg: 'bg-purple-500', icon: 'text-purple-500' },
    orange: { bg: 'bg-orange-500', icon: 'text-orange-500' },
    pink: { bg: 'bg-pink-500', icon: 'text-pink-500' },
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-750 hover:border-gray-600 border border-transparent' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 truncate">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {previousValue !== undefined && (
            <p className="text-xs text-gray-400 mt-0.5">Previous: {previousValue}</p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 ${colorClasses[color].bg} rounded-lg flex items-center justify-center flex-shrink-0 opacity-80`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
});

// Traffic Chart Component
const TrafficChart = memo(function TrafficChart({
  data
}: {
  data: Array<{ date: string; pageViews: number }>
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        No traffic data available
      </div>
    );
  }

  const maxViews = Math.max(...data.map(d => d.pageViews), 1);
  const totalViews = data.reduce((sum, d) => sum + d.pageViews, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Page views over time</span>
        <span className="font-medium">{totalViews} total</span>
      </div>
      <div className="h-24 flex items-end gap-1">
        {data.slice(-14).map((day, i) => {
          const height = (day.pageViews / maxViews) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${day.date}: ${day.pageViews} views`}
            >
              <div
                className="w-full bg-cyan-500 rounded-t transition-all duration-300 min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{data.slice(-14)[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
});

// Generic breakdown item type
interface BreakdownItem {
  [key: string]: string | number;
  count: number;
  percentage: number;
}

// Horizontal Bar Chart for breakdowns
const HorizontalBarChart = memo(function HorizontalBarChart({
  data,
  labelKey,
  valueKey,
  color = 'cyan',
  maxItems = 5,
}: {
  data: BreakdownItem[];
  labelKey: string;
  valueKey: string;
  color?: 'cyan' | 'blue' | 'green' | 'purple' | 'orange';
  maxItems?: number;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'bg-cyan-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const slicedData = data.slice(0, maxItems);
  const maxValue = Math.max(...slicedData.map(d => d[valueKey] as number), 1);

  if (slicedData.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">No data</div>
    );
  }

  return (
    <div className="space-y-2">
      {slicedData.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 truncate max-w-[120px]">
              {item[labelKey]}
            </span>
            <span className="text-gray-400 font-medium">
              {item[valueKey]} ({item.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${colorClasses[color]}`}
              style={{ width: `${((item[valueKey] as number) / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

// Top Pages Component
const TopPagesChart = memo(function TopPagesChart({ pages }: { pages: TopPage[] }) {
  if (pages.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">No page data</div>
    );
  }

  const maxViews = Math.max(...pages.map(p => p.views), 1);

  return (
    <div className="space-y-2">
      {pages.slice(0, 6).map((page, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-cyan-900/30 flex items-center justify-center text-xs font-medium text-cyan-400">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300 truncate">
                {page.page}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {page.views} views
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
              <div
                className="h-1 rounded-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${(page.views / maxViews) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// Hourly Activity Component
const HourlyActivityChart = memo(function HourlyActivityChart({
  data
}: {
  data: number[]
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">No activity data</div>
    );
  }

  const maxActivity = Math.max(...data, 1);

  return (
    <div className="space-y-2">
      <div className="h-16 flex items-end gap-[2px]">
        {data.map((count, hour) => {
          const height = (count / maxActivity) * 100;
          return (
            <div
              key={hour}
              className="flex-1 bg-purple-500 rounded-t transition-all duration-300 opacity-70 hover:opacity-100"
              style={{ height: `${Math.max(height, 4)}%` }}
              title={`${hour}:00 - ${count} events`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
});

/** Renders the main analytics overview panel with key platform metrics. */
export const AnalyticsPanel = memo(function AnalyticsPanel() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { compareEnabled } = useComparison();

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    previousData?: DrillDownDataPoint[];
    color?: string;
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const defaultData: AnalyticsData = {
    summary: {
      totalUsers: 0,
      totalNotifications: 0,
      totalBetaRequests: 0,
      activeBetaUsers: 0,
      growthRate: 0,
      churnRate: 0,
      totalPageViews: 0,
      uniqueVisitors: 0,
    },
    trafficMetrics: {
      totalPageViews: 0,
      totalEventsAllTime: 0,
      uniqueSessions: 0,
      uniqueUsers: 0,
      avgPagesPerSession: 0,
    },
    trafficTrends: [],
    deviceBreakdown: [],
    browserBreakdown: [],
    osBreakdown: [],
    topPages: [],
    hourlyActivity: [],
    betaMetrics: {
      conversionRate: 0,
      approvalRate: 0,
      retentionRate: 0,
      averageActivityScore: 0,
    },
    userGrowth: [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: analyticsData, isLoading, refetch } = useQuery<AnalyticsData & { previousPeriod?: any }>({
    queryKey: ['admin-analytics', timeRange, compareEnabled ? 'compare' : 'no-compare'],
    queryFn: async () => {
      const url = compareEnabled
        ? `/api/admin/analytics?range=${timeRange}&compare=true`
        : `/api/admin/analytics?range=${timeRange}`;
      const response = await adminFetch(url);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      return result.analytics;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const data: AnalyticsData = analyticsData || defaultData;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Open drill-down for a specific metric
  const openDrillDown = useCallback((metric: string) => {
    if (!analyticsData) return;
    let chartData: DrillDownDataPoint[] = [];
    let previousChartData: DrillDownDataPoint[] | undefined;
    let title = '';
    let color = '#06b6d4';

    switch (metric) {
      case 'pageViews':
        chartData = (analyticsData.trafficTrends || []).map((d) => ({
          date: d.date, value: d.pageViews,
        }));
        if (compareEnabled && analyticsData.previousPeriod?.trafficTrends) {
          previousChartData = analyticsData.previousPeriod.trafficTrends.map((d: { date: string; pageViews: number }) => ({
            date: d.date, value: d.pageViews,
          }));
        }
        title = 'Page Views — Daily Traffic';
        color = '#06b6d4';
        break;
      case 'visitors':
        chartData = (analyticsData.userGrowth || []).map((d) => ({
          date: d.date, value: d.users,
        }));
        if (compareEnabled && analyticsData.previousPeriod?.userGrowth) {
          previousChartData = analyticsData.previousPeriod.userGrowth.map((d: { date: string; users: number }) => ({
            date: d.date, value: d.users,
          }));
        }
        title = 'Unique Visitors — Daily Growth';
        color = '#3b82f6';
        break;
      case 'activeUsers':
        chartData = (analyticsData.trafficTrends || []).map((d) => ({
          date: d.date, value: d.pageViews,
        }));
        title = 'Active Users — Daily Activity';
        color = '#10b981';
        break;
      case 'pagesPerSession':
        chartData = (analyticsData.trafficTrends || []).map((d) => ({
          date: d.date, value: d.pageViews,
        }));
        title = 'Pages per Session — Daily Average';
        color = '#a855f7';
        break;
    }

    if (chartData.length > 0) {
      setDrillDown({ isOpen: true, title, metric, data: chartData, previousData: previousChartData, color });
    }
  }, [analyticsData, compareEnabled]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-auto">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-cyan-900/30 text-cyan-400'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Traffic Overview KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-semibold text-white">Traffic Overview</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            title="Page Views"
            value={data.trafficMetrics?.totalPageViews || 0}
            previousValue={compareEnabled && analyticsData?.previousPeriod?.summary?.totalPageViews !== undefined
              ? analyticsData.previousPeriod.summary.totalPageViews
              : undefined}
            subtitle={`${data.trafficMetrics?.totalEventsAllTime || 0} all time`}
            icon={Eye}
            color="cyan"
            onClick={() => openDrillDown('pageViews')}
          />
          <MetricCard
            title="Unique Visitors"
            value={data.trafficMetrics?.uniqueSessions || 0}
            previousValue={compareEnabled && analyticsData?.previousPeriod?.summary?.uniqueVisitors !== undefined
              ? analyticsData.previousPeriod.summary.uniqueVisitors
              : undefined}
            subtitle="By session"
            icon={Users}
            color="blue"
            onClick={() => openDrillDown('visitors')}
          />
          <MetricCard
            title="Active Users"
            value={data.trafficMetrics?.uniqueUsers || 0}
            subtitle="Logged in"
            icon={Activity}
            color="green"
            onClick={() => openDrillDown('activeUsers')}
          />
          <MetricCard
            title="Pages/Session"
            value={data.trafficMetrics?.avgPagesPerSession || 0}
            subtitle="Average"
            icon={Layers}
            color="purple"
            onClick={() => openDrillDown('pagesPerSession')}
          />
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-semibold text-white">Traffic Trends</h3>
        </div>
        <TrafficChart data={data.trafficTrends || []} />
      </div>

      {/* Two Column Layout for breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointer className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-white">Top Pages</h3>
          </div>
          <TopPagesChart pages={data.topPages || []} />
        </div>

        {/* Hourly Activity */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-white">Activity by Hour</h3>
          </div>
          <HourlyActivityChart data={data.hourlyActivity || []} />
        </div>
      </div>

      {/* Three Column Layout for device/browser/OS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Breakdown */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-white">Devices</h3>
          </div>
          <HorizontalBarChart
            data={data.deviceBreakdown || []}
            labelKey="device"
            valueKey="count"
            color="blue"
          />
        </div>

        {/* Browser Breakdown */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-white">Browsers</h3>
          </div>
          <HorizontalBarChart
            data={data.browserBreakdown || []}
            labelKey="browser"
            valueKey="count"
            color="green"
          />
        </div>

        {/* OS Breakdown */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-white">Operating Systems</h3>
          </div>
          <HorizontalBarChart
            data={data.osBreakdown || []}
            labelKey="os"
            valueKey="count"
            color="orange"
          />
        </div>
      </div>

      {/* Beta Program Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-white">Beta Program Summary</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data.summary.totalBetaRequests}
            </p>
            <p className="text-xs text-gray-400">Beta Requests</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data.summary.activeBetaUsers}
            </p>
            <p className="text-xs text-gray-400">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data.betaMetrics.approvalRate}%
            </p>
            <p className="text-xs text-gray-400">Approval Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {data.betaMetrics.conversionRate}%
            </p>
            <p className="text-xs text-gray-400">Conversion Rate</p>
          </div>
        </div>
      </div>

      {/* Data Note */}
      <div className="text-xs text-gray-400 text-center py-2">
        Analytics data is cached for 15 minutes. Click refresh to get latest data.
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle={`Last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
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
