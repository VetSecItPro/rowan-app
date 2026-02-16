'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Users,
  Calendar,
  TrendingDown,
  Activity,
  RefreshCw,
  ArrowUpRight,
  HeartPulse,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useComparison } from '@/components/admin/ComparisonContext';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';
import { getBenchmarkLevel, getBenchmarkColor, getBenchmarkBgColor } from '@/lib/constants/benchmarks';

type SubTab = 'dau-mau' | 'cohorts' | 'churn' | 'lifecycle';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dau-mau', label: 'DAU / MAU', icon: Activity },
  { id: 'cohorts', label: 'Cohorts', icon: Calendar },
  { id: 'churn', label: 'Churn', icon: TrendingDown },
  { id: 'lifecycle', label: 'Lifecycle', icon: HeartPulse },
];

interface RetentionData {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  stickinessLabel: string;
  dauTrend: { date: string; count: number }[];
  cohorts: {
    cohort: string;
    users: number;
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  }[];
  churn: {
    rate: number;
    churned: number;
    retained: number;
  };
  lastUpdated: string;
}

interface BusinessMetrics {
  nrr?: number;
  scorecard?: {
    mrr?: number;
    churnRate?: number;
    dauMauRatio?: number;
  };
  ltv?: number;
  cac?: number;
  mrrWaterfall?: {
    month: string;
    startingMrr: number;
    newMrr: number;
    expansionMrr: number;
    contractionMrr: number;
    churnedMrr: number;
    endingMrr: number;
  }[];
  revenueByCohort?: {
    cohortMonth: string;
    users: number;
    currentMrr: number;
  }[];
}

interface LifecycleData {
  resurrectionRate: number;
  medianTimeToValueHours: number;
  atRiskCount: number;
  atRiskUsers: {
    userId: string;
    email: string;
    name: string | null;
    lastActiveAt: string;
    daysSinceActive: number;
  }[];
}

// Hook to fetch retention data
function useRetentionData(range: string = '30d', compareEnabled: boolean = false) {
  return useQuery<RetentionData & { previousPeriod?: { dau: number; wau: number; mau: number; stickiness: number; dauTrend: { date: string; count: number }[] } }>({
    queryKey: ['admin-retention', range, compareEnabled ? 'compare' : 'no-compare'],
    queryFn: async () => {
      const url = compareEnabled
        ? `/api/admin/retention?range=${range}&compare=true`
        : `/api/admin/retention?range=${range}`;
      const response = await adminFetch(url);
      if (!response.ok) throw new Error('Failed to fetch retention data');
      const result = await response.json();
      return result.retention;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Hook to fetch business metrics
function useBusinessMetrics() {
  return useQuery<BusinessMetrics>({
    queryKey: ['admin-business-metrics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/business-metrics');
      if (!response.ok) throw new Error('Failed');
      return (await response.json()).metrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// DAU/MAU Panel
// ---------------------------------------------------------------------------

const DauMauPanel = memo(function DauMauPanel() {
  const { compareEnabled } = useComparison();
  const { data, isLoading, refetch, isFetching } = useRetentionData('30d', compareEnabled);
  const { data: businessData } = useBusinessMetrics();

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
    const dauTrend = data.dauTrend || [];
    const prevDauTrend = data.previousPeriod?.dauTrend;

    let chartData: DrillDownDataPoint[] = [];
    let previousChartData: DrillDownDataPoint[] | undefined;
    let title = '';
    let color = '#3b82f6';

    switch (metric) {
      case 'dau':
        chartData = dauTrend.map((d) => ({ date: d.date, value: d.count }));
        if (compareEnabled && prevDauTrend) {
          previousChartData = prevDauTrend.map((d: { date: string; count: number }) => ({ date: d.date, value: d.count }));
        }
        title = 'Daily Active Users — Trend';
        color = '#3b82f6';
        break;
      case 'wau':
        chartData = dauTrend.map((d) => ({ date: d.date, value: d.count }));
        title = 'Weekly Active Users — Daily Breakdown';
        color = '#6366f1';
        break;
      case 'mau':
        chartData = dauTrend.map((d) => ({ date: d.date, value: d.count }));
        if (compareEnabled && prevDauTrend) {
          previousChartData = prevDauTrend.map((d: { date: string; count: number }) => ({ date: d.date, value: d.count }));
        }
        title = 'Monthly Active Users — Daily Breakdown';
        color = '#a855f7';
        break;
      case 'stickiness':
        chartData = dauTrend.map((d) => ({ date: d.date, value: d.count }));
        title = 'Stickiness — Daily Active Users';
        color = '#10b981';
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

  const dau = data?.dau || 0;
  const wau = data?.wau || 0;
  const mau = data?.mau || 0;
  const stickiness = data?.stickiness || 0;
  const stickinessLabel = data?.stickinessLabel || 'No data';
  const dauTrend = data?.dauTrend || [];
  const prevPeriod = data?.previousPeriod;

  // NRR data
  const nrr = businessData?.nrr || 0;
  const nrrLevel = getBenchmarkLevel('nrr', nrr);

  // Get last 7 days for weekly chart
  const weeklyData = dauTrend.slice(-7);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div
          className="bg-blue-600 rounded-xl p-5 text-white cursor-pointer hover:bg-blue-500 transition-colors"
          onClick={() => openDrillDown('dau')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('dau'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Daily Active Users</p>
              <p className="text-4xl font-bold mt-2">{dau}</p>
              {compareEnabled && prevPeriod && (
                <p className="text-blue-200 text-xs mt-0.5">Previous: {prevPeriod.dau}</p>
              )}
              <p className="text-blue-200 text-xs mt-1">Last 24 hours</p>
            </div>
            <Activity className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div
          className="bg-indigo-600 rounded-xl p-5 text-white cursor-pointer hover:bg-indigo-500 transition-colors"
          onClick={() => openDrillDown('wau')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('wau'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Weekly Active Users</p>
              <p className="text-4xl font-bold mt-2">{wau}</p>
              {compareEnabled && prevPeriod && (
                <p className="text-indigo-200 text-xs mt-0.5">Previous: {prevPeriod.wau}</p>
              )}
              <p className="text-indigo-200 text-xs mt-1">Last 7 days</p>
            </div>
            <Users className="w-10 h-10 text-indigo-200" />
          </div>
        </div>

        <div
          className="bg-purple-600 rounded-xl p-5 text-white cursor-pointer hover:bg-purple-500 transition-colors"
          onClick={() => openDrillDown('mau')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('mau'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Monthly Active Users</p>
              <p className="text-4xl font-bold mt-2">{mau}</p>
              {compareEnabled && prevPeriod && (
                <p className="text-purple-200 text-xs mt-0.5">Previous: {prevPeriod.mau}</p>
              )}
              <p className="text-purple-200 text-xs mt-1">Last 30 days</p>
            </div>
            <Users className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div
          className="bg-green-600 rounded-xl p-5 text-white cursor-pointer hover:bg-green-500 transition-colors"
          onClick={() => openDrillDown('stickiness')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('stickiness'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Stickiness (DAU/MAU)</p>
              <p className="text-4xl font-bold mt-2">{stickiness}%</p>
              {compareEnabled && prevPeriod && (
                <p className="text-green-200 text-xs mt-0.5">Previous: {prevPeriod.stickiness}%</p>
              )}
              <p className="text-green-200 text-xs mt-1">{stickinessLabel}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-green-200 rotate-180" />
          </div>
        </div>

        {/* NRR Card */}
        <div className={`rounded-xl p-5 text-white ${getBenchmarkBgColor(nrrLevel)} border border-gray-700`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Net Revenue Retention</p>
              <p className={`text-4xl font-bold mt-2 ${getBenchmarkColor(nrrLevel)}`}>
                {nrr > 0 ? `${nrr}%` : '--'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {nrr > 0 ? `Benchmark: ${nrrLevel}` : 'Awaiting data'}
              </p>
            </div>
            <ArrowUpRight className={`w-10 h-10 ${getBenchmarkColor(nrrLevel)}`} />
          </div>
        </div>
      </div>

      {/* Stickiness Explanation */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Understanding Stickiness</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-3 rounded-lg ${stickiness < 10 && stickiness > 0 ? 'ring-2 ring-red-500' : ''} bg-red-900/20`}>
            <p className="text-lg font-bold text-red-400">&lt;10%</p>
            <p className="text-xs text-red-300">Needs improvement</p>
          </div>
          <div className={`p-3 rounded-lg ${stickiness >= 10 && stickiness < 20 ? 'ring-2 ring-yellow-500' : ''} bg-yellow-900/20`}>
            <p className="text-lg font-bold text-yellow-400">10-20%</p>
            <p className="text-xs text-yellow-300">Good for most apps</p>
          </div>
          <div className={`p-3 rounded-lg ${stickiness >= 20 ? 'ring-2 ring-green-500' : ''} bg-green-900/20`}>
            <p className="text-lg font-bold text-green-400">&gt;20%</p>
            <p className="text-xs text-green-300">Excellent engagement</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Social apps like Facebook have ~50% stickiness. Productivity apps typically range 15-25%.
        </p>
      </div>

      {/* Weekly Trend */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Daily Active Users (Last 7 Days)</h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {(weeklyData?.length ?? 0) > 0 ? (
          <div className="h-32 flex items-end gap-2">
            {weeklyData.map((day, i) => {
              const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{day.count}</span>
                  <div
                    className="w-full bg-purple-500 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-400">{dayName}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            No activity data yet
          </div>
        )}
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

// ---------------------------------------------------------------------------
// Cohorts Panel
// ---------------------------------------------------------------------------

const CohortsPanel = memo(function CohortsPanel() {
  const { data, isLoading, refetch, isFetching } = useRetentionData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cohorts = data?.cohorts || [];

  // Color based on retention percentage
  const getRetentionColor = (pct: number) => {
    if (pct < 0) return 'bg-gray-700 text-gray-400';
    if (pct >= 50) return 'bg-green-900/30 text-green-400';
    if (pct >= 30) return 'bg-green-900/20 text-green-400';
    if (pct >= 15) return 'bg-yellow-900/20 text-yellow-400';
    return 'bg-red-900/20 text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-semibold text-white">Cohort Retention Analysis</h3>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Track how users from each signup week retain over time. Each row shows the percentage of users who returned.
        </p>

        {/* Cohort Table */}
        {cohorts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-3 pr-4">Cohort Week</th>
                  <th className="pb-3 px-2 text-center">Users</th>
                  <th className="pb-3 px-2 text-center">Week 1</th>
                  <th className="pb-3 px-2 text-center">Week 2</th>
                  <th className="pb-3 px-2 text-center">Week 3</th>
                  <th className="pb-3 px-2 text-center">Week 4</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {cohorts.map((cohort, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="py-3 pr-4 font-medium">{cohort.cohort}</td>
                    <td className="py-3 px-2 text-center">{cohort.users}</td>
                    <td className="py-3 px-2 text-center">
                      {cohort.week1 >= 0 ? (
                        <span className={`px-2 py-1 rounded text-xs ${getRetentionColor(cohort.week1)}`}>
                          {cohort.week1}%
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {cohort.week2 >= 0 ? (
                        <span className={`px-2 py-1 rounded text-xs ${getRetentionColor(cohort.week2)}`}>
                          {cohort.week2}%
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {cohort.week3 >= 0 ? (
                        <span className={`px-2 py-1 rounded text-xs ${getRetentionColor(cohort.week3)}`}>
                          {cohort.week3}%
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {cohort.week4 >= 0 ? (
                        <span className={`px-2 py-1 rounded text-xs ${getRetentionColor(cohort.week4)}`}>
                          {cohort.week4}%
                        </span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No cohort data yet</p>
            <p className="text-xs mt-1">Cohorts will appear as users sign up over time</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-indigo-900/20 rounded-lg">
          <p className="text-sm text-indigo-300">
            <strong>How to read:</strong> Each row represents users who signed up in that week.
            The percentages show what portion returned each subsequent week. Higher is better.
          </p>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Churn Panel
// ---------------------------------------------------------------------------

const ChurnPanel = memo(function ChurnPanel() {
  const { data, isLoading, refetch, isFetching } = useRetentionData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const churnRate = data?.churn?.rate || 0;
  const churned = data?.churn?.churned || 0;
  const retained = data?.churn?.retained || 0;
  const totalUsers = churned + retained;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-400">Churn Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {totalUsers > 0 ? `${churnRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Users inactive 30+ days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-400">Churned Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{churned}</p>
          <p className="text-xs text-gray-400 mt-1">No activity in 30 days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">Retained Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{retained}</p>
          <p className="text-xs text-gray-400 mt-1">Active in last 30 days</p>
        </div>
      </div>

      {/* Retention vs Churn Visual */}
      {totalUsers > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Retention Overview</h3>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="h-8 bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${100 - churnRate}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${churnRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-green-400">Retained: {100 - churnRate}%</span>
            <span className="text-red-400">Churned: {churnRate}%</span>
          </div>
        </div>
      )}

      {/* Churn Definitions */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Churn Definitions</h3>

        <div className="space-y-4">
          <div className="p-4 bg-red-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-red-300">Churned</h4>
            </div>
            <p className="text-xs text-red-400">
              Users who signed up more than 60 days ago but haven&apos;t been active in the last 30 days.
            </p>
          </div>

          <div className="p-4 bg-orange-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-orange-300 mb-2">At-Risk</h4>
            <p className="text-xs text-orange-400">
              Users inactive for 14-30 days may benefit from re-engagement campaigns.
            </p>
          </div>

          <div className="p-4 bg-green-900/20 rounded-lg">
            <h4 className="text-sm font-medium text-green-300 mb-2">Healthy Retention</h4>
            <p className="text-xs text-green-400">
              For family apps, aim for &lt;5% monthly churn. Higher values indicate product or engagement issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Lifecycle Panel
// ---------------------------------------------------------------------------

const LifecyclePanel = memo(function LifecyclePanel() {
  const { data, isLoading } = useQuery<LifecycleData>({
    queryKey: ['admin-user-lifecycle'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/user-lifecycle');
      if (!response.ok) throw new Error('Failed to fetch lifecycle data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading lifecycle data...</span>
      </div>
    );
  }

  const resurrectionRate = data?.resurrectionRate ?? 0;
  const medianTtv = data?.medianTimeToValueHours ?? 0;
  const atRiskCount = data?.atRiskCount ?? 0;
  const atRiskUsers = data?.atRiskUsers ?? [];

  return (
    <div className="space-y-6">
      {/* Key Lifecycle Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">Resurrection Rate</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {resurrectionRate > 0 ? `${resurrectionRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Churned users who returned</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-gray-400">Time-to-Value</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {medianTtv > 0 ? `${medianTtv.toFixed(1)}h` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Median hours to first key action</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-400">At-Risk Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{atRiskCount}</p>
          <p className="text-xs text-gray-400 mt-1">Inactive 14-30 days</p>
        </div>
      </div>

      {/* At-Risk Users List */}
      {atRiskUsers.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-semibold text-white">At-Risk Users (Top 10)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 px-2 text-center">Last Active</th>
                  <th className="pb-3 px-2 text-center">Days Inactive</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {atRiskUsers.slice(0, 10).map((user) => (
                  <tr key={user.userId} className="border-t border-gray-700">
                    <td className="py-3 pr-4 truncate max-w-[200px]">
                      {user.name || user.email}
                    </td>
                    <td className="py-3 px-2 text-center text-gray-400 text-xs">
                      {new Date(user.lastActiveAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.daysSinceActive >= 25 ? 'bg-red-900/20 text-red-400' :
                        user.daysSinceActive >= 20 ? 'bg-orange-900/20 text-orange-400' :
                        'bg-yellow-900/20 text-yellow-400'
                      }`}>
                        {user.daysSinceActive}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Industry Benchmark */}
      <div className="p-4 bg-purple-900/20 rounded-lg">
        <p className="text-sm text-purple-300">
          <strong>Industry benchmark:</strong> Target &lt;5% monthly churn for family apps.
          Resurrection campaigns can recover 5-15% of churned users with timely re-engagement emails.
        </p>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/** Displays user retention cohort analysis and churn metrics. */
export const RetentionPanel = memo(function RetentionPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dau-mau');

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
                  ? 'border-purple-500 text-purple-400'
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
        {activeSubTab === 'dau-mau' && <DauMauPanel />}
        {activeSubTab === 'cohorts' && <CohortsPanel />}
        {activeSubTab === 'churn' && <ChurnPanel />}
        {activeSubTab === 'lifecycle' && <LifecyclePanel />}
      </div>
    </div>
  );
});
