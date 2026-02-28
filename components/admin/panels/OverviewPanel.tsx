'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Users,
  TrendingUp,
  Globe,
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useComparison } from '@/components/admin/ComparisonContext';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';
import { getBenchmarkLevel, getBenchmarkColor, getBenchmarkBgColor } from '@/lib/constants/benchmarks';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
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
    growthRate: number;
  };
  trafficMetrics: {
    totalPageViews: number;
    uniqueSessions: number;
  };
}

interface InviteAnalytics {
  totalSent: number;
  accepted: number;
  pending: number;
  expired: number;
  cancelled: number;
  conversionRate: number;
  dailyTrend: { date: string; sent: number; accepted: number }[];
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
            <p className="text-xs text-gray-400 mt-0.5">Previous: {previousValue}</p>
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
  uptimeDisplay,
}: {
  status: 'healthy' | 'degraded' | 'down';
  uptimeDisplay: string;
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
          <p className="text-sm text-gray-400">Process uptime: {uptimeDisplay || '--'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-2xl font-bold ${config.color}`}>{status === 'healthy' ? 'OK' : status === 'degraded' ? 'WARN' : 'DOWN'}</p>
        <p className="text-xs text-gray-400">Current status</p>
      </div>
    </div>
  );
});

// Quick Stats Row
const QuickStat = memo(function QuickStat({
  label,
  value,
  subValue,
  onClick,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`text-center p-3 bg-gray-800 rounded-lg ${onClick ? 'cursor-pointer hover:bg-gray-750 transition-colors' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
});

/** Renders the admin dashboard overview with summary cards and key metrics. */
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

  // Fetch business metrics for scorecard
  const { data: businessData } = useQuery({
    queryKey: ['admin-business-metrics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/business-metrics');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return data.metrics;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch real health status
  const { data: healthData } = useQuery({
    queryKey: ['admin-health-status'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/health');
      if (!response.ok) throw new Error('Failed to fetch health');
      const result = await response.json();
      return result.health as { overall: 'healthy' | 'warning' | 'critical'; uptime: string };
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch real visitor analytics from site_visits
  const { data: visitorData } = useQuery({
    queryKey: ['admin-visitor-analytics', '30d'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/visitor-analytics?range=30d');
      if (!response.ok) throw new Error('Failed to fetch visitor analytics');
      const result = await response.json();
      return result.visitorAnalytics as { uniqueVisitors: number; totalPageViews: number; signupConversionRate: number };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch invite analytics
  const { data: inviteData } = useQuery<InviteAnalytics>({
    queryKey: ['admin-invite-analytics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/invite-analytics');
      if (!response.ok) throw new Error('Failed to fetch invite analytics');
      const result = await response.json();
      return result.inviteAnalytics;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Generate alerts from business data
  const alerts = useMemo(() => {
    if (!businessData?.scorecard) return [];
    const items: { message: string; severity: 'warning' | 'critical' }[] = [];
    const sc = businessData.scorecard;
    if (sc.churnRate > 8) items.push({ message: `Churn rate at ${sc.churnRate}% — above 8% threshold`, severity: 'critical' });
    else if (sc.churnRate > 5) items.push({ message: `Churn rate at ${sc.churnRate}% — monitor closely`, severity: 'warning' });
    if (sc.dauMauRatio < 8) items.push({ message: `DAU/MAU ratio at ${sc.dauMauRatio}% — engagement is low`, severity: 'warning' });
    if (sc.mrrGrowthRate < 0) items.push({ message: `MRR declining at ${sc.mrrGrowthRate}%`, severity: 'critical' });
    return items;
  }, [businessData]);

  const isLoading = statsLoading || analyticsLoading;

  // Build scorecard items from business data
  const scorecardItems = useMemo(() => {
    if (!businessData?.scorecard) return [];
    const sc = businessData.scorecard;
    return [
      {
        label: 'MRR',
        value: `$${(sc.mrr ?? 0).toFixed(2)}`,
        level: getBenchmarkLevel('mrrGrowth', sc.mrrGrowthRate ?? 0),
      },
      {
        label: 'MRR Growth',
        value: `${sc.mrrGrowthRate ?? 0}%`,
        level: getBenchmarkLevel('mrrGrowth', sc.mrrGrowthRate ?? 0),
      },
      {
        label: 'Churn Rate',
        value: `${sc.churnRate ?? 0}%`,
        level: getBenchmarkLevel('churn', sc.churnRate ?? 0),
      },
      {
        label: 'DAU/MAU',
        value: `${sc.dauMauRatio ?? 0}%`,
        level: getBenchmarkLevel('dauMau', sc.dauMauRatio ?? 0),
      },
      {
        label: 'NRR',
        value: `${sc.nrr ?? 0}%`,
        level: getBenchmarkLevel('nrr', sc.nrr ?? 0),
      },
      {
        label: 'Activation Rate',
        value: `${sc.activationRate ?? 0}%`,
        level: getBenchmarkLevel('activationRate', sc.activationRate ?? 0),
      },
    ];
  }, [businessData]);

  // Open drill-down for a specific KPI metric
  const openDrillDown = useCallback((metric: string) => {
    // Handle invite drill-down separately
    if (metric === 'invites') {
      if (!inviteData?.dailyTrend?.length) return;
      const data: DrillDownDataPoint[] = inviteData.dailyTrend.map(d => ({
        date: d.date,
        value: d.sent,
      }));
      setDrillDown({
        isOpen: true,
        title: 'Invites — Daily Sent vs Accepted',
        metric: 'invites',
        data,
        color: '#f97316',
      });
      return;
    }

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

    if ((data?.length ?? 0) > 0) {
      setDrillDown({ isOpen: true, title, metric, data, previousData, color });
    }
  }, [analyticsData, compareEnabled, inviteData]);

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
    summary: { totalPageViews: 0, uniqueVisitors: 0, growthRate: 0 },
    trafficMetrics: { totalPageViews: 0, uniqueSessions: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <HealthStatus
        status={healthData?.overall === 'critical' ? 'down' : healthData?.overall === 'warning' ? 'degraded' : healthData ? 'healthy' : 'degraded'}
        uptimeDisplay={healthData?.uptime || '--'}
      />

      {/* Business Health Scorecard */}
      {scorecardItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Business Scorecard</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {scorecardItems.map((item) => (
              <div key={item.label} className={`${getBenchmarkBgColor(item.level)} rounded-lg p-3 text-center`}>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-xl font-bold ${getBenchmarkColor(item.level)}`}>{item.value}</p>
                <p className="text-xs text-gray-500">{item.level}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomaly Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${alert.severity === 'warning' ? 'bg-yellow-900/20' : 'bg-red-900/20'}`}>
              <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.severity === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
              <p className={`text-sm ${alert.severity === 'warning' ? 'text-yellow-300' : 'text-red-300'}`}>{alert.message}</p>
            </div>
          ))}
        </div>
      )}

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
            title="Site Visitors"
            value={visitorData?.uniqueVisitors ?? analytics.trafficMetrics?.totalPageViews ?? 0}
            icon={Globe}
            color="cyan"
            onClick={() => openDrillDown('pageViews')}
          />
          <KPICard
            title="Active Users"
            value={safeStats.users?.active || 0}
            icon={Activity}
            color="green"
            onClick={() => openDrillDown('active')}
          />
          <KPICard
            title="Conversion Rate"
            value={`${visitorData?.signupConversionRate ?? 0}%`}
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
          <QuickStat label="Signups" value={safeStats.totalUsers || 0} />
          <QuickStat label="Launch Signups" value={safeStats.launchSignups || 0} />
          <QuickStat label="Unique Visitors" value={analytics.trafficMetrics?.uniqueSessions || 0} />
          <QuickStat
            label="Invites Sent"
            value={inviteData?.totalSent || 0}
            onClick={() => openDrillDown('invites')}
          />
          <QuickStat
            label="Accepted"
            value={inviteData?.accepted || 0}
            onClick={() => openDrillDown('invites')}
          />
          <QuickStat
            label="Invite Rate"
            value={`${inviteData?.conversionRate || 0}%`}
            onClick={() => openDrillDown('invites')}
          />
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
