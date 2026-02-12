'use client';

import { memo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Users,
  TrendingUp,
  Eye,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useComparison } from '@/components/admin/ComparisonContext';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  beta: {
    requests: number;
    approved: number;
    pending: number;
  };
  subscriptions: {
    active: number;
    mrr: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
  };
}

interface AnalyticsData {
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    activeBetaUsers: number;
    growthRate: number;
  };
  trafficMetrics: {
    totalPageViews: number;
    uniqueSessions: number;
  };
  betaMetrics: {
    conversionRate: number;
    approvalRate: number;
  };
}

// KPI Card with trend indicator
const KPICard = memo(function KPICard({
  title,
  value,
  previousValue,
  trend,
  trendLabel,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  value: string | number;
  previousValue?: string | number;
  trend?: number;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'orange' | 'pink';
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
  };

  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={`bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-700 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-750 hover:border-gray-600' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {previousValue !== undefined && (
            <p className="text-xs text-gray-500 mt-0.5">Previous: {previousValue}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-400">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
});

// Health Status Indicator
const HealthStatus = memo(function HealthStatus({
  status,
  uptime,
}: {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
}) {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-900/30', label: 'All Systems Operational' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-900/30', label: 'Degraded Performance' },
    down: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-900/30', label: 'System Issues' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`${config.bg} rounded-xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-6 h-6 ${config.color}`} />
        <div>
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-sm text-gray-400">Uptime: {uptime}%</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-white">{uptime}%</p>
        <p className="text-xs text-gray-500">Last 30 days</p>
      </div>
    </div>
  );
});

// Quick Stats Row
const QuickStat = memo(function QuickStat({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="text-center p-3 bg-gray-800 rounded-lg">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
});

export const OverviewPanel = memo(function OverviewPanel() {
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

  // Fetch dashboard stats - shares cache with main dashboard page
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await adminFetch(`/api/admin/dashboard/stats?t=${Date.now()}&refresh=true`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.stats;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch analytics for traffic data (with comparison if enabled)
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics', '30d', compareEnabled ? 'compare' : 'no-compare'],
    queryFn: async () => {
      const url = compareEnabled
        ? '/api/admin/analytics?range=30d&compare=true'
        : '/api/admin/analytics?range=30d';
      const response = await adminFetch(url);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      return result.analytics;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const isLoading = statsLoading || analyticsLoading;

  // Open drill-down for a specific KPI metric
  const openDrillDown = useCallback((metric: string) => {
    if (!analyticsData) return;
    let data: DrillDownDataPoint[] = [];
    let previousData: DrillDownDataPoint[] | undefined;
    let title = '';
    let color = '#8b5cf6';

    switch (metric) {
      case 'users':
        data = (analyticsData.userGrowth || []).map((d: { date: string; users: number }) => ({
          date: d.date, value: d.users,
        }));
        if (compareEnabled && analyticsData.previousPeriod?.userGrowth) {
          previousData = analyticsData.previousPeriod.userGrowth.map((d: { date: string; users: number }) => ({
            date: d.date, value: d.users,
          }));
        }
        title = 'Total Users — Daily Registrations';
        color = '#3b82f6';
        break;
      case 'pageViews':
        data = (analyticsData.trafficTrends || []).map((d: { date: string; pageViews: number }) => ({
          date: d.date, value: d.pageViews,
        }));
        if (compareEnabled && analyticsData.previousPeriod?.trafficTrends) {
          previousData = analyticsData.previousPeriod.trafficTrends.map((d: { date: string; pageViews: number }) => ({
            date: d.date, value: d.pageViews,
          }));
        }
        title = 'Page Views — Daily Traffic';
        color = '#06b6d4';
        break;
      case 'active':
        data = (analyticsData.trafficTrends || []).map((d: { date: string; pageViews: number }) => ({
          date: d.date, value: d.pageViews,
        }));
        title = 'Active Users — Daily Activity';
        color = '#10b981';
        break;
      case 'conversion':
        data = (analyticsData.signupTrends || []).map((d: { date: string; signups: number }) => ({
          date: d.date, value: d.signups,
        }));
        title = 'Conversion — Daily Signups';
        color = '#a855f7';
        break;
    }

    if (data.length > 0) {
      setDrillDown({ isOpen: true, title, metric, data, previousData, color });
    }
  }, [analyticsData, compareEnabled]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading overview...</span>
      </div>
    );
  }

  // Use stats directly (already extracted in queryFn), provide defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeStats: Partial<DashboardStats> & Record<string, any> = stats || {};
  const analytics: AnalyticsData = analyticsData || {
    summary: { totalPageViews: 0, uniqueVisitors: 0, activeBetaUsers: 0, growthRate: 0 },
    trafficMetrics: { totalPageViews: 0, uniqueSessions: 0 },
    betaMetrics: { conversionRate: 0, approvalRate: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <HealthStatus status="healthy" uptime={99.9} />

      {/* Primary KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Users"
            value={safeStats.users?.total || 0}
            previousValue={compareEnabled && analyticsData?.previousPeriod?.summary?.totalUsers !== undefined
              ? analyticsData.previousPeriod.summary.totalUsers
              : undefined}
            trend={analytics.summary?.growthRate}
            trendLabel="vs last period"
            icon={Users}
            color="blue"
            onClick={() => openDrillDown('users')}
          />
          <KPICard
            title="Page Views"
            value={analytics.trafficMetrics?.totalPageViews || 0}
            previousValue={compareEnabled && analyticsData?.previousPeriod?.summary?.totalPageViews !== undefined
              ? analyticsData.previousPeriod.summary.totalPageViews
              : undefined}
            icon={Eye}
            color="cyan"
            onClick={() => openDrillDown('pageViews')}
          />
          <KPICard
            title="Active Users"
            value={analytics.summary?.activeBetaUsers || 0}
            icon={Activity}
            color="green"
            onClick={() => openDrillDown('active')}
          />
          <KPICard
            title="Conversion Rate"
            value={`${analytics.betaMetrics?.conversionRate || 0}%`}
            icon={TrendingUp}
            color="purple"
            onClick={() => openDrillDown('conversion')}
          />
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Growth & Acquisition</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <QuickStat label="Beta Requests" value={safeStats.betaRequests || 0} />
          <QuickStat label="Codes Sent" value={safeStats.codesSent || 0} />
          <QuickStat label="Signups" value={safeStats.totalUsers || 0} />
          <QuickStat label="Launch Signups" value={safeStats.launchSignups || 0} />
          <QuickStat label="Invite Success" value={`${analytics.betaMetrics?.approvalRate || 0}%`} />
          <QuickStat label="Unique Visitors" value={analytics.trafficMetrics?.uniqueSessions || 0} />
        </div>
      </div>

      {/* Beta Program Status */}
      <div className="bg-purple-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Beta Program</h3>
            <p className="text-purple-100 text-sm mt-1">Limited to 100 users</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{safeStats.betaUsers || 0}/100</p>
            <p className="text-purple-100 text-sm">slots filled</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-purple-400/30 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white transition-all duration-500"
              style={{ width: `${Math.min((safeStats.betaUsers || 0), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>Data refreshes every minute</span>
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle="Last 30 days"
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
