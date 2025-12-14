'use client';

import { useState, useEffect, memo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  Mail,
  Target,
  RefreshCw,
  Activity,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalUsers: number;
    totalNotifications: number;
    totalBetaRequests: number;
    activeBetaUsers: number;
    growthRate: number;
    churnRate: number;
  };
  betaMetrics: {
    conversionRate: number;
    approvalRate: number;
    retentionRate: number;
    averageActivityScore: number;
  };
  userGrowth: Array<{ date: string; users: number }>;
}

const MetricCard = memo(function MetricCard({
  title,
  value,
  change,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  change?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{change}</p>
          )}
        </div>
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center opacity-80`}>
          {color === 'blue' && <Users className="w-5 h-5 text-white" />}
          {color === 'green' && <Mail className="w-5 h-5 text-white" />}
          {color === 'purple' && <Shield className="w-5 h-5 text-white" />}
          {color === 'orange' && <Target className="w-5 h-5 text-white" />}
        </div>
      </div>
    </div>
  );
});

const ProgressBar = memo(function ProgressBar({
  label,
  value,
  color = 'blue'
}: {
  label: string;
  value: number;
  color?: 'blue' | 'green' | 'purple';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClasses[color]}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
});

// Simple mini line chart
const MiniChart = memo(function MiniChart({ data }: { data: Array<{ date: string; users: number }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  const maxUsers = Math.max(...data.map(d => d.users));
  const minUsers = Math.min(...data.map(d => d.users));
  const range = maxUsers - minUsers || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.users - minUsers) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-20" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#chartGradient)"
      />
      <polyline
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});

export const AnalyticsPanel = memo(function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData>({
    summary: {
      totalUsers: 0,
      totalNotifications: 0,
      totalBetaRequests: 0,
      activeBetaUsers: 0,
      growthRate: 0,
      churnRate: 0,
    },
    betaMetrics: {
      conversionRate: 0,
      approvalRate: 0,
      retentionRate: 0,
      averageActivityScore: 0,
    },
    userGrowth: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Total Users"
          value={data.summary.totalUsers}
          change={data.summary.growthRate > 0 ? `+${data.summary.growthRate}% growth` : undefined}
          color="blue"
        />
        <MetricCard
          title="Notification Signups"
          value={data.summary.totalNotifications}
          color="green"
        />
        <MetricCard
          title="Beta Users"
          value={data.summary.activeBetaUsers}
          color="purple"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data.betaMetrics.conversionRate}%`}
          color="orange"
        />
      </div>

      {/* User Growth Chart */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">User Growth</span>
          </div>
        </div>
        <MiniChart data={data.userGrowth} />
      </div>

      {/* Beta Metrics */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Beta Program Metrics</span>
        </div>
        <ProgressBar label="Approval Rate" value={data.betaMetrics.approvalRate} color="green" />
        <ProgressBar label="Retention Rate" value={data.betaMetrics.retentionRate} color="blue" />
        <ProgressBar label="Activity Score" value={(data.betaMetrics.averageActivityScore / 10) * 100} color="purple" />
      </div>

      {/* Insights */}
      {data.summary.totalUsers > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Growth</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Tracking user growth patterns
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-green-900 dark:text-green-200">Beta Program</h4>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Monitoring beta engagement
            </p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-orange-900 dark:text-orange-200">Data Collection</h4>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Building analytics foundation
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
