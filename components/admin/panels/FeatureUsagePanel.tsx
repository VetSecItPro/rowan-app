'use client';

import { useState, useEffect, memo } from 'react';
import {
  Layers,
  Eye,
  Users,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

interface FeatureUsageSummary {
  feature: string;
  displayName: string;
  pageViews: number;
  uniqueUsers: number;
  totalActions: number;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

interface FeatureUsageData {
  summary: FeatureUsageSummary[];
  totals: {
    totalPageViews: number;
    totalUniqueUsers: number;
    totalActions: number;
    deviceBreakdown: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  };
}

const FEATURE_COLORS: Record<string, string> = {
  dashboard: '#6366F1',
  tasks: '#3B82F6',
  calendar: '#8B5CF6',
  reminders: '#EC4899',
  shopping: '#10B981',
  meals: '#F97316',
  messages: '#22C55E',
  goals: '#6366F1',
  projects: '#0EA5E9',
  expenses: '#EF4444',
};

const TrendIcon = memo(function TrendIcon({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
  if (direction === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-gray-400" />;
});

const DeviceBar = memo(function DeviceBar({ breakdown }: { breakdown: { mobile: number; desktop: number; tablet: number } }) {
  const total = breakdown.mobile + breakdown.desktop + breakdown.tablet;
  if (total === 0) return <span className="text-xs text-gray-400">-</span>;

  const mobilePercent = (breakdown.mobile / total) * 100;
  const desktopPercent = (breakdown.desktop / total) * 100;

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 w-20">
      <div className="bg-blue-500" style={{ width: `${mobilePercent}%` }} title={`Mobile: ${Math.round(mobilePercent)}%`} />
      <div className="bg-purple-500" style={{ width: `${desktopPercent}%` }} title={`Desktop: ${Math.round(desktopPercent)}%`} />
      <div className="bg-green-500 flex-1" title={`Tablet: ${Math.round(100 - mobilePercent - desktopPercent)}%`} />
    </div>
  );
});

export const FeatureUsagePanel = memo(function FeatureUsagePanel() {
  const [data, setData] = useState<FeatureUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/feature-usage?range=${timeRange}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch feature usage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading feature usage...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Layers className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No feature usage data available</p>
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
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Eye className="w-3 h-3" />
            Page Views
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totals.totalPageViews)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Users className="w-3 h-3" />
            Unique Users
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totals.totalUniqueUsers)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <MousePointerClick className="w-3 h-3" />
            Actions
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatNumber(data.totals.totalActions)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Layers className="w-3 h-3" />
            Active Features
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {data.summary.length}
          </p>
        </div>
      </div>

      {/* Device Distribution */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Device Distribution</p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Smartphone className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.totals.deviceBreakdown.mobile)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mobile</p>
          </div>
          <div>
            <Monitor className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.totals.deviceBreakdown.desktop)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Desktop</p>
          </div>
          <div>
            <Tablet className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(data.totals.deviceBreakdown.tablet)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tablet</p>
          </div>
        </div>
      </div>

      {/* Feature Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Feature</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Views</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Users</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Devices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.summary.map((feature) => (
                <tr key={feature.feature} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: FEATURE_COLORS[feature.feature] || '#6B7280' }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{feature.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                    {formatNumber(feature.pageViews)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                    {formatNumber(feature.uniqueUsers)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon direction={feature.trendDirection} />
                      <span className={`text-xs font-medium ${
                        feature.trendDirection === 'up' ? 'text-green-600' :
                        feature.trendDirection === 'down' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {feature.trend > 0 ? '+' : ''}{feature.trend}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 flex justify-center">
                    <DeviceBar breakdown={feature.deviceBreakdown} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.summary.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No feature usage data yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
