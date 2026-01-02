'use client';

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  Eye,
  UserCheck,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

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
  trend,
  trendLabel,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'orange' | 'pink';
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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-500 dark:text-gray-400">{trendLabel}</span>}
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
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'All Systems Operational' },
    degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Degraded Performance' },
    down: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'System Issues' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`${config.bg} rounded-xl p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-6 h-6 ${config.color}`} />
        <div>
          <p className={`font-medium ${config.color}`}>{config.label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Uptime: {uptime}%</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{uptime}%</p>
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
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
});

export const OverviewPanel = memo(function OverviewPanel() {
  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/dashboard/stats?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch analytics for traffic data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
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

  const isLoading = statsLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading overview...</span>
      </div>
    );
  }

  const stats = statsData || {};
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
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Key Metrics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Users"
            value={stats.totalUsers || 0}
            trend={analytics.summary?.growthRate}
            trendLabel="vs last period"
            icon={Users}
            color="blue"
          />
          <KPICard
            title="Page Views"
            value={analytics.trafficMetrics?.totalPageViews || 0}
            icon={Eye}
            color="cyan"
          />
          <KPICard
            title="Active Users"
            value={analytics.summary?.activeBetaUsers || 0}
            icon={Activity}
            color="green"
          />
          <KPICard
            title="Conversion Rate"
            value={`${analytics.betaMetrics?.conversionRate || 0}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Growth & Acquisition</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <QuickStat label="Beta Requests" value={stats.betaRequests || 0} />
          <QuickStat label="Codes Sent" value={stats.codesSent || 0} />
          <QuickStat label="Signups" value={stats.totalUsers || 0} />
          <QuickStat label="Launch Signups" value={stats.launchSignups || 0} />
          <QuickStat label="Approval Rate" value={`${analytics.betaMetrics?.approvalRate || 0}%`} />
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
            <p className="text-3xl font-bold">{stats.totalUsers || 0}/100</p>
            <p className="text-purple-100 text-sm">slots filled</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-purple-400/30 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white transition-all duration-500"
              style={{ width: `${Math.min((stats.totalUsers || 0), 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions / What to Look At */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Growth</p>
            <p className="text-xs text-gray-500">View acquisition funnel</p>
          </button>
          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <Activity className="w-5 h-5 text-cyan-500 mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Engagement</p>
            <p className="text-xs text-gray-500">See user activity</p>
          </button>
          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <UserCheck className="w-5 h-5 text-purple-500 mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Retention</p>
            <p className="text-xs text-gray-500">Check cohort data</p>
          </button>
          <button className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <DollarSign className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">Revenue</p>
            <p className="text-xs text-gray-500">View MRR trends</p>
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        <span>Data refreshes every minute</span>
      </div>
    </div>
  );
});
