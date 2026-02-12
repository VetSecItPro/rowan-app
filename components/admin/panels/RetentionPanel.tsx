'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  TrendingDown,
  Activity,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';

type SubTab = 'dau-mau' | 'cohorts' | 'churn';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dau-mau', label: 'DAU / MAU', icon: Activity },
  { id: 'cohorts', label: 'Cohorts', icon: Calendar },
  { id: 'churn', label: 'Churn', icon: TrendingDown },
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

// Hook to fetch retention data
function useRetentionData(range: string = '30d') {
  return useQuery<RetentionData>({
    queryKey: ['admin-retention', range],
    queryFn: async () => {
      const response = await fetch(`/api/admin/retention?range=${range}`);
      if (!response.ok) throw new Error('Failed to fetch retention data');
      const result = await response.json();
      return result.retention;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// DAU/MAU Panel
const DauMauPanel = memo(function DauMauPanel() {
  const { data, isLoading, refetch, isFetching } = useRetentionData();

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

  // Get last 7 days for weekly chart
  const weeklyData = dauTrend.slice(-7);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Daily Active Users</p>
              <p className="text-4xl font-bold mt-2">{dau}</p>
              <p className="text-blue-200 text-xs mt-1">Last 24 hours</p>
            </div>
            <Activity className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-indigo-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Weekly Active Users</p>
              <p className="text-4xl font-bold mt-2">{wau}</p>
              <p className="text-indigo-200 text-xs mt-1">Last 7 days</p>
            </div>
            <Users className="w-10 h-10 text-indigo-200" />
          </div>
        </div>

        <div className="bg-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Monthly Active Users</p>
              <p className="text-4xl font-bold mt-2">{mau}</p>
              <p className="text-purple-200 text-xs mt-1">Last 30 days</p>
            </div>
            <Users className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Stickiness (DAU/MAU)</p>
              <p className="text-4xl font-bold mt-2">{stickiness}%</p>
              <p className="text-green-200 text-xs mt-1">{stickinessLabel}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-green-200 rotate-180" />
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
        <p className="text-xs text-gray-500 mt-4">
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
        {weeklyData.length > 0 ? (
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
    </div>
  );
});

// Cohorts Panel
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
          <div className="py-8 text-center text-gray-500">
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

// Churn Panel
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
          <p className="text-xs text-gray-500 mt-1">Users inactive 30+ days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-400">Churned Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{churned}</p>
          <p className="text-xs text-gray-500 mt-1">No activity in 30 days</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">Retained Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{retained}</p>
          <p className="text-xs text-gray-500 mt-1">Active in last 30 days</p>
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
      </div>
    </div>
  );
});
