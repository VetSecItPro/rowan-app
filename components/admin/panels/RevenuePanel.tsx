'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, Repeat, RefreshCw, AlertCircle } from 'lucide-react';
import { SubscriptionsPanel } from './SubscriptionsPanel';

type SubTab = 'subscriptions' | 'mrr' | 'conversions';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'mrr', label: 'MRR Trends', icon: TrendingUp },
  { id: 'conversions', label: 'Conversions', icon: Repeat },
];

interface SubscriptionMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  totalSubscribers: number;
  proSubscribers: number;
  familySubscribers: number;
  freeUsers: number;
  trialUsers: number;
  tierDistribution: { tier: string; count: number; percentage: number; mrr: number }[];
  periodDistribution: { period: string; count: number; percentage: number }[];
  newSubscriptionsThisMonth: number;
  cancellationsThisMonth: number;
  netGrowth: number;
  churnRate: number;
  conversionRate: number;
  recentEvents: {
    created: number;
    upgraded: number;
    downgraded: number;
    cancelled: number;
    reactivated: number;
    paymentFailed: number;
  };
}

interface DailyRevenueData {
  date: string;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  subscriptions: number;
  cancellations: number;
}

interface SubscriptionAnalyticsResponse {
  success: boolean;
  metrics: SubscriptionMetrics;
  dailyRevenue: DailyRevenueData[];
  lastUpdated: string;
}

// Hook to fetch subscription analytics
function useSubscriptionAnalytics() {
  return useQuery<SubscriptionAnalyticsResponse>({
    queryKey: ['admin-subscription-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subscription-analytics?view=all&days=30');
      if (!response.ok) throw new Error('Failed to fetch subscription analytics');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// MRR Panel
const MrrPanel = memo(function MrrPanel() {
  const { data, isLoading, refetch, isFetching } = useSubscriptionAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const dailyRevenue = data?.dailyRevenue || [];

  const mrr = metrics?.mrr || 0;
  const arr = metrics?.arr || 0;
  const arpu = metrics?.arpu || 0;
  const netGrowth = metrics?.netGrowth || 0;
  const newMrrThisMonth = dailyRevenue.reduce((sum, d) => sum + d.newMrr, 0);
  const churnedMrrThisMonth = dailyRevenue.reduce((sum, d) => sum + d.churnedMrr, 0);

  // Calculate MRR growth rate
  const firstHalfMrr = dailyRevenue.slice(0, 15).reduce((sum, d) => sum + d.mrr, 0) / 15 || 0;
  const secondHalfMrr = dailyRevenue.slice(15).reduce((sum, d) => sum + d.mrr, 0) / 15 || 0;
  const mrrGrowth = firstHalfMrr > 0 ? Math.round(((secondHalfMrr - firstHalfMrr) / firstHalfMrr) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* MRR Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(mrr)}</p>
              <p className="text-green-200 text-xs mt-1">Current MRR</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">ARR</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(arr)}</p>
          <p className="text-xs text-gray-500 mt-1">Annual run rate</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">MRR Growth</p>
          <p className={`text-2xl font-bold mt-1 ${mrrGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {mrrGrowth >= 0 ? '+' : ''}{mrrGrowth}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Month over month</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">ARPU</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(arpu)}</p>
          <p className="text-xs text-gray-500 mt-1">Per paying user</p>
        </div>
      </div>

      {/* MRR Breakdown */}
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">MRR Movement</h3>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-green-900/20 rounded-lg text-center">
            <ArrowUpRight className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-400">{formatCurrency(newMrrThisMonth)}</p>
            <p className="text-xs text-green-300">New MRR</p>
          </div>
          <div className="p-3 bg-blue-900/20 rounded-lg text-center">
            <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-400">
              {netGrowth >= 0 ? '+' : ''}{netGrowth}
            </p>
            <p className="text-xs text-blue-300">Net Growth</p>
          </div>
          <div className="p-3 bg-orange-900/20 rounded-lg text-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1 rotate-180" />
            <p className="text-lg font-bold text-orange-400">
              {metrics?.cancellationsThisMonth || 0}
            </p>
            <p className="text-xs text-orange-300">Cancellations</p>
          </div>
          <div className="p-3 bg-red-900/20 rounded-lg text-center">
            <ArrowUpRight className="w-5 h-5 text-red-500 mx-auto mb-1 rotate-180" />
            <p className="text-lg font-bold text-red-400">{formatCurrency(churnedMrrThisMonth)}</p>
            <p className="text-xs text-red-300">Churned MRR</p>
          </div>
        </div>
      </div>

      {/* MRR Chart */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">MRR Over Time (Last 30 Days)</h3>
        {dailyRevenue.length > 0 && mrr > 0 ? (
          <div className="h-48 flex items-end gap-1">
            {dailyRevenue.slice(-30).map((day, i) => {
              const maxMrr = Math.max(...dailyRevenue.map(d => d.mrr), 1);
              const height = (day.mrr / maxMrr) * 100;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${formatCurrency(day.mrr)}`}>
                  <div
                    className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-400"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-600 rounded-lg">
            <div className="text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No revenue data yet</p>
              <p className="text-xs mt-1">MRR chart will appear once subscriptions are active</p>
            </div>
          </div>
        )}
      </div>

      {/* Beta Phase Note */}
      {mrr === 0 && (
        <div className="p-4 bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Beta Phase:</strong> Revenue metrics will populate once paid subscriptions are active.
            During beta, all users have free access.
          </p>
        </div>
      )}
    </div>
  );
});

// Conversions Panel
const ConversionsPanel = memo(function ConversionsPanel() {
  const { data, isLoading, refetch, isFetching } = useSubscriptionAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = data?.metrics;
  const conversionRate = metrics?.conversionRate || 0;
  const freeUsers = metrics?.freeUsers || 0;
  const trialUsers = metrics?.trialUsers || 0;
  const totalSubscribers = metrics?.totalSubscribers || 0;
  const recentEvents = metrics?.recentEvents;

  // Calculate funnel percentages
  const totalUsers = freeUsers + trialUsers + totalSubscribers;
  const freePercent = totalUsers > 0 ? Math.round((freeUsers / totalUsers) * 100) : 100;
  const trialPercent = totalUsers > 0 ? Math.round((trialUsers / totalUsers) * 100) : 0;
  const paidPercent = totalUsers > 0 ? Math.round((totalSubscribers / totalUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-400">Free to Paid</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {conversionRate > 0 ? `${conversionRate}%` : '--'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Conversion rate</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">Upgrades</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {recentEvents?.upgraded || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-500 rotate-180" />
            <span className="text-sm font-medium text-gray-400">Downgrades</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {recentEvents?.downgraded || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>
      </div>

      {/* Event Summary */}
      {recentEvents && (
        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Subscription Events This Month</h3>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{recentEvents.created}</p>
              <p className="text-xs text-green-300">New Subscriptions</p>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{recentEvents.reactivated}</p>
              <p className="text-xs text-blue-300">Reactivations</p>
            </div>
            <div className="p-3 bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-400">{recentEvents.cancelled}</p>
              <p className="text-xs text-red-300">Cancellations</p>
            </div>
            {recentEvents.paymentFailed > 0 && (
              <div className="p-3 bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <p className="text-2xl font-bold text-orange-400">{recentEvents.paymentFailed}</p>
                </div>
                <p className="text-xs text-orange-300">Payment Failures</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subscription Funnel */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Subscription Funnel</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Free Users</div>
            <div className="flex-1 bg-gray-700 rounded-full h-8 overflow-hidden">
              <div
                className="h-8 rounded-full bg-blue-500 flex items-center justify-end px-3 transition-all duration-500"
                style={{ width: `${Math.max(freePercent, 5)}%` }}
              >
                <span className="text-xs text-white font-medium">{freeUsers}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Trial</div>
            <div className="flex-1 bg-gray-700 rounded-full h-8 overflow-hidden">
              <div
                className="h-8 rounded-full bg-purple-500 flex items-center justify-end px-3 transition-all duration-500"
                style={{ width: `${Math.max(trialPercent, 2)}%` }}
              >
                <span className="text-xs text-white font-medium">{trialUsers}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Paid</div>
            <div className="flex-1 bg-gray-700 rounded-full h-8 overflow-hidden">
              <div
                className="h-8 rounded-full bg-green-500 flex items-center justify-end px-3 transition-all duration-500"
                style={{ width: `${Math.max(paidPercent, 2)}%` }}
              >
                <span className="text-xs text-white font-medium">{totalSubscribers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LTV Metrics - Placeholder for now since we need more historical data */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Customer Lifetime Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">LTV</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalSubscribers > 0 ? formatCurrency(metrics?.arpu || 0 * 12) : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Estimated (ARPU x 12)</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">Churn Rate</p>
            <p className="text-2xl font-bold text-white mt-1">
              {metrics?.churnRate !== undefined ? `${metrics.churnRate}%` : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Monthly</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">Net Subscriber Growth</p>
            <p className={`text-2xl font-bold mt-1 ${(metrics?.netGrowth || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics?.netGrowth !== undefined ? (metrics.netGrowth >= 0 ? `+${metrics.netGrowth}` : metrics.netGrowth) : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </div>
        </div>
      </div>

      {totalSubscribers === 0 && (
        <div className="p-4 bg-purple-900/20 rounded-lg">
          <p className="text-sm text-purple-300">
            <strong>Beta Phase:</strong> All current users have free beta access.
            Conversion tracking will become more meaningful when paid plans launch.
          </p>
        </div>
      )}
    </div>
  );
});

export const RevenuePanel = memo(function RevenuePanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('subscriptions');

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
                  ? 'border-orange-500 text-orange-400'
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
        {activeSubTab === 'subscriptions' && <SubscriptionsPanel />}
        {activeSubTab === 'mrr' && <MrrPanel />}
        {activeSubTab === 'conversions' && <ConversionsPanel />}
      </div>
    </div>
  );
});
