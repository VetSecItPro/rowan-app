'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

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
    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-700 w-20">
      <div className="bg-blue-500" style={{ width: `${mobilePercent}%` }} title={`Mobile: ${Math.round(mobilePercent)}%`} />
      <div className="bg-purple-500" style={{ width: `${desktopPercent}%` }} title={`Desktop: ${Math.round(desktopPercent)}%`} />
      <div className="bg-green-500 flex-1" title={`Tablet: ${Math.round(100 - mobilePercent - desktopPercent)}%`} />
    </div>
  );
});

/** Displays per-feature usage statistics and adoption rates. */
export const FeatureUsagePanel = memo(function FeatureUsagePanel() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
  }>({ isOpen: false, title: '', metric: '', data: [] });

  // React Query for feature usage with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-feature-usage', timeRange],
    queryFn: async () => {
      const response = await adminFetch(`/api/admin/feature-usage?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch feature usage');
      const result = await response.json();
      if (result.success) {
        return result.data as FeatureUsageData;
      }
      return null;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Open drill-down for a specific stat card metric
  const openDrillDown = useCallback((metric: string) => {
    if (!data) return;
    let drillData: DrillDownDataPoint[] = [];
    let title = '';
    let color = '#f59e0b';
    const chartType: 'area' | 'bar' = 'bar';

    const summary = data.summary ?? [];

    switch (metric) {
      case 'views':
        drillData = summary.map((f) => ({
          date: f.displayName,
          value: f.pageViews,
        }));
        title = 'Page Views by Feature';
        color = '#3b82f6';
        break;
      case 'users':
        drillData = summary.map((f) => ({
          date: f.displayName,
          value: f.uniqueUsers,
        }));
        title = 'Unique Users by Feature';
        color = '#8b5cf6';
        break;
      case 'actions':
        drillData = summary.map((f) => ({
          date: f.displayName,
          value: f.totalActions,
        }));
        title = 'Total Actions by Feature';
        color = '#10b981';
        break;
      case 'devices':
        drillData = [
          { date: 'Mobile', value: data.totals?.deviceBreakdown?.mobile ?? 0 },
          { date: 'Desktop', value: data.totals?.deviceBreakdown?.desktop ?? 0 },
          { date: 'Tablet', value: data.totals?.deviceBreakdown?.tablet ?? 0 },
        ];
        title = 'Device Breakdown';
        color = '#06b6d4';
        break;
    }

    if (drillData.length > 0) {
      setDrillDown({ isOpen: true, title, metric, data: drillData, color, chartType });
    }
  }, [data]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading feature usage...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Layers className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No feature usage data available</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-amber-900/30 text-amber-400'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Row - All 7 cards in single row */}
      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-2 flex-shrink-0 min-w-[600px]">
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('views')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('views'); }}
        >
          <p className="text-lg font-bold text-white">{formatNumber(data?.totals?.totalPageViews ?? 0)}</p>
          <p className="text-xs text-gray-400">Views</p>
        </div>
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('users')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('users'); }}
        >
          <p className="text-lg font-bold text-white">{formatNumber(data?.totals?.totalUniqueUsers ?? 0)}</p>
          <p className="text-xs text-gray-400">Users</p>
        </div>
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('actions')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('actions'); }}
        >
          <p className="text-lg font-bold text-white">{formatNumber(data?.totals?.totalActions ?? 0)}</p>
          <p className="text-xs text-gray-400">Actions</p>
        </div>
        <div className="bg-amber-900/20 rounded-lg p-2 text-center border border-amber-800">
          <p className="text-lg font-bold text-amber-400">{data?.summary?.length ?? 0}</p>
          <p className="text-xs text-amber-400">Features</p>
        </div>
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('devices')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('devices'); }}
        >
          <p className="text-lg font-bold text-blue-400">{formatNumber(data?.totals?.deviceBreakdown?.mobile ?? 0)}</p>
          <p className="text-xs text-gray-400">Mobile</p>
        </div>
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('devices')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('devices'); }}
        >
          <p className="text-lg font-bold text-purple-400">{formatNumber(data?.totals?.deviceBreakdown?.desktop ?? 0)}</p>
          <p className="text-xs text-gray-400">Desktop</p>
        </div>
        <div
          className="bg-gray-800 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-750 transition-colors"
          onClick={() => openDrillDown('devices')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('devices'); }}
        >
          <p className="text-lg font-bold text-green-400">{formatNumber(data?.totals?.deviceBreakdown?.tablet ?? 0)}</p>
          <p className="text-xs text-gray-400">Tablet</p>
        </div>
      </div>
      </div>

      {/* Feature Table */}
      <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Feature</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Views</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Users</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase">Trend</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase">Devices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(data?.summary ?? []).map((feature) => (
                <tr key={feature.feature} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: FEATURE_COLORS[feature.feature] || '#6B7280' }}
                      />
                      <span className="font-medium text-white">{feature.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400">
                    {formatNumber(feature.pageViews)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400">
                    {formatNumber(feature.uniqueUsers)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon direction={feature.trendDirection} />
                      <span className={`text-xs font-medium ${
                        feature.trendDirection === 'up' ? 'text-green-600' :
                        feature.trendDirection === 'down' ? 'text-red-600' :
                        'text-gray-400'
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
          {(data?.summary?.length ?? 0) === 0 && (
            <div className="p-8 text-center text-gray-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No feature usage data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle={`Last ${timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}`}
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
