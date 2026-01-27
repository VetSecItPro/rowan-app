'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Mail, Sparkles, RefreshCw, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { NotificationsPanel } from './NotificationsPanel';
import { ConversionFunnelPanel } from './ConversionFunnelPanel';

type SubTab = 'acquisition' | 'funnel' | 'signups';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'acquisition', label: 'Acquisition', icon: Sparkles },
  { id: 'funnel', label: 'Funnel', icon: GitBranch },
  { id: 'signups', label: 'Signups', icon: Mail },
];

interface AcquisitionData {
  totalVisitors: number;
  totalSignups: number;
  overallConversionRate: number;
  sources: {
    source: string;
    count: number;
    percentage: number;
    conversions: number;
    conversionRate: number;
  }[];
  referrers: {
    referrer: string;
    count: number;
    percentage: number;
  }[];
  dailyTrend: { date: string; visitors: number; signups: number }[];
  topChannels: { channel: string; visitors: number; trend: number }[];
  lastUpdated: string;
}

// Hook to fetch acquisition data
function useAcquisitionData(range: string = '30d') {
  return useQuery<AcquisitionData>({
    queryKey: ['admin-acquisition', range],
    queryFn: async () => {
      const response = await fetch(`/api/admin/acquisition?range=${range}`);
      if (!response.ok) throw new Error('Failed to fetch acquisition data');
      const result = await response.json();
      return result.acquisition;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Acquisition Panel - shows where users come from
const AcquisitionPanel = memo(function AcquisitionPanel() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, isLoading, refetch, isFetching } = useAcquisitionData(range);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalVisitors = data?.totalVisitors || 0;
  const totalSignups = data?.totalSignups || 0;
  const conversionRate = data?.overallConversionRate || 0;
  const sources = data?.sources || [];
  const referrers = data?.referrers || [];
  const dailyTrend = data?.dailyTrend || [];
  const topChannels = data?.topChannels || [];

  return (
    <div className="space-y-6">
      {/* Range Selector and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Visitors</p>
              <p className="text-3xl font-bold mt-2">{totalVisitors}</p>
              <p className="text-green-200 text-xs mt-1">Beta + Launch signups</p>
            </div>
            <Sparkles className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">Total Signups</p>
          <p className="text-2xl font-bold text-white mt-1">{totalSignups}</p>
          <p className="text-xs text-gray-500 mt-1">Registered users</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
          <p className="text-2xl font-bold text-white mt-1">
            {conversionRate > 0 ? `${conversionRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Visitor to signup</p>
        </div>
      </div>

      {/* Sources and Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Traffic Sources</h4>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{source.source}</span>
                    {source.conversionRate > 0 && (
                      <span className="text-xs text-green-400">
                        ({source.conversionRate}% conv)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{source.count}</span>
                    <span className="text-xs text-gray-500">({source.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No source data available yet
            </p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Top Referrers</h4>
          {referrers.length > 0 ? (
            <div className="space-y-3">
              {referrers.slice(0, 6).map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-400 truncate max-w-[150px]">
                      {ref.referrer}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{ref.count}</span>
                    <span className="text-xs text-gray-500">({ref.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No referrer data yet. Referrers appear when users arrive from external links.
            </p>
          )}
        </div>
      </div>

      {/* Top Channels */}
      {topChannels.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Channel Performance</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topChannels.map((channel, idx) => (
              <div key={idx} className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-400">{channel.channel}</p>
                <p className="text-xl font-bold text-white mt-1">{channel.visitors}</p>
                {channel.trend !== 0 && (
                  <div className={`flex items-center gap-1 mt-1 ${channel.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {channel.trend > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span className="text-xs">{Math.abs(channel.trend)}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Daily Acquisition Trend</h4>
          <div className="h-32 flex items-end gap-1">
            {dailyTrend.slice(-14).map((day, i) => {
              const maxVisitors = Math.max(...dailyTrend.map(d => d.visitors), 1);
              const height = (day.visitors / maxVisitors) * 100;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.visitors} visitors, ${day.signups} signups`}>
                  <div
                    className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-400"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{dailyTrend.length > 14 ? dailyTrend[dailyTrend.length - 14]?.date : dailyTrend[0]?.date}</span>
            <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {totalVisitors === 0 && (
        <div className="p-4 bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Early Stage:</strong> Acquisition data will populate as visitors sign up for beta or launch notifications.
            Source tracking is captured from the source field in beta requests and launch notifications.
          </p>
        </div>
      )}
    </div>
  );
});

// Signups Panel
const SignupsPanel = memo(function SignupsPanel() {
  return <NotificationsPanel />;
});

export const GrowthPanel = memo(function GrowthPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('funnel');

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
                  ? 'border-green-500 text-green-400'
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
        {activeSubTab === 'acquisition' && <AcquisitionPanel />}
        {activeSubTab === 'funnel' && <ConversionFunnelPanel />}
        {activeSubTab === 'signups' && <SignupsPanel />}
      </div>
    </div>
  );
});
