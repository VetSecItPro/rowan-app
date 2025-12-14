'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  MousePointerClick,
  Users,
  Layers,
} from 'lucide-react';

interface FeatureUsageSummary {
  feature: string;
  displayName: string;
  pageViews: number;
  uniqueUsers: number;
  totalActions: number;
  avgDailyUsers: number;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

interface FeatureUsageData {
  timeRange: string;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: FeatureUsageSummary[];
  dailyData: Array<{
    date: string;
    features: Record<string, {
      pageViews: number;
      uniqueUsers: number;
      actions: number;
    }>;
  }>;
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
  lastUpdated: string;
}

// Feature colors
const FEATURE_COLORS: Record<string, string> = {
  dashboard: '#6366F1',
  tasks: '#3B82F6',
  calendar: '#8B5CF6',
  reminders: '#EC4899',
  shopping: '#10B981',
  meals: '#F97316',
  recipes: '#F59E0B',
  messages: '#22C55E',
  goals: '#6366F1',
  household: '#F59E0B',
  projects: '#0EA5E9',
  expenses: '#EF4444',
  rewards: '#A855F7',
  checkin: '#14B8A6',
  settings: '#64748B',
};

export default function FeatureUsagePage() {
  const [data, setData] = useState<FeatureUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchData = async (refresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/admin/feature-usage?range=${timeRange}${refresh ? '&refresh=true' : ''}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch feature usage data');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const DeviceBreakdownBar = ({ breakdown }: { breakdown: { mobile: number; desktop: number; tablet: number } }) => {
    const total = breakdown.mobile + breakdown.desktop + breakdown.tablet;
    if (total === 0) return <div className="text-xs text-gray-400">No data</div>;

    const mobilePercent = (breakdown.mobile / total) * 100;
    const desktopPercent = (breakdown.desktop / total) * 100;
    const tabletPercent = (breakdown.tablet / total) * 100;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          <div
            className="bg-blue-500"
            style={{ width: `${mobilePercent}%` }}
            title={`Mobile: ${breakdown.mobile}`}
          />
          <div
            className="bg-purple-500"
            style={{ width: `${desktopPercent}%` }}
            title={`Desktop: ${breakdown.desktop}`}
          />
          <div
            className="bg-green-500"
            style={{ width: `${tabletPercent}%` }}
            title={`Tablet: ${breakdown.tablet}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> {mobilePercent.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <Monitor className="w-3 h-3" /> {desktopPercent.toFixed(0)}%
          </span>
          <span className="flex items-center gap-1">
            <Tablet className="w-3 h-3" /> {tabletPercent.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs currentPage="Feature Usage" />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Feature Usage Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Track which features users interact with most
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={() => fetchData(true)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading feature usage data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Failed to Load Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => fetchData()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Page Views</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatNumber(data.totals.totalPageViews)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatNumber(data.totals.totalUniqueUsers)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Actions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {formatNumber(data.totals.totalActions)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <MousePointerClick className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Features</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {data.summary.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Device Distribution
              </h3>
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Smartphone className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(data.totals.deviceBreakdown.mobile)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Mobile</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Monitor className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(data.totals.deviceBreakdown.desktop)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Desktop</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Tablet className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(data.totals.deviceBreakdown.tablet)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tablet</p>
                </div>
              </div>
            </div>

            {/* Feature Usage Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Feature Usage Breakdown
                </h3>
              </div>

              {data.summary.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Usage Data Yet
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                    Feature usage data will appear here once users start interacting with the app.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Feature
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Page Views
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Unique Users
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Avg Daily
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Trend
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Devices
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {data.summary.map((feature, index) => (
                        <tr
                          key={feature.feature}
                          className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: FEATURE_COLORS[feature.feature] || '#6B7280' }}
                              />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {feature.displayName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                            {formatNumber(feature.pageViews)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                            {formatNumber(feature.uniqueUsers)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                            {formatNumber(feature.totalActions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 dark:text-white">
                            {feature.avgDailyUsers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <TrendIcon direction={feature.trendDirection} />
                              <span
                                className={`text-sm font-medium ${
                                  feature.trendDirection === 'up'
                                    ? 'text-green-600'
                                    : feature.trendDirection === 'down'
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {feature.trend > 0 ? '+' : ''}{feature.trend}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 w-48">
                            <DeviceBreakdownBar breakdown={feature.deviceBreakdown} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Actions by Feature */}
            {data.summary.some(f => f.topActions.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Top Actions by Feature
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.summary
                    .filter(f => f.topActions.length > 0)
                    .slice(0, 6)
                    .map((feature) => (
                      <div
                        key={feature.feature}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: FEATURE_COLORS[feature.feature] || '#6B7280' }}
                          />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {feature.displayName}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {feature.topActions.map((action, idx) => (
                            <div
                              key={action.action}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-600 dark:text-gray-400 capitalize">
                                {action.action.replace('_', ' ')}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatNumber(action.count)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
