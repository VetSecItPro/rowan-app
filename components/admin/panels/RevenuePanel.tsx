'use client';

import { useState, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, Repeat, RefreshCw, AlertCircle, BarChart3, Users } from 'lucide-react';
import { SubscriptionsPanel } from './SubscriptionsPanel';
import { getBenchmarkLevel, getBenchmarkColor, getBenchmarkBgColor } from '@/lib/constants/benchmarks';

type SubTab = 'subscriptions' | 'mrr' | 'conversions' | 'waterfall' | 'cohorts';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'mrr', label: 'MRR Trends', icon: TrendingUp },
  { id: 'conversions', label: 'Conversions', icon: Repeat },
  { id: 'waterfall', label: 'MRR Waterfall', icon: BarChart3 },
  { id: 'cohorts', label: 'Cohorts', icon: Users },
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

interface BusinessMetrics {
  nrr?: number;
  ltv?: number;
  cac?: number;
  ltvCacRatio?: number;
  scorecard?: {
    mrr?: number;
    churnRate?: number;
    dauMauRatio?: number;
  };
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

// Hook to fetch subscription analytics
function useSubscriptionAnalytics() {
  return useQuery<SubscriptionAnalyticsResponse>({
    queryKey: ['admin-subscription-analytics'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/subscription-analytics?view=all&days=30');
      if (!response.ok) throw new Error('Failed to fetch subscription analytics');
      return response.json();
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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// MRR Panel (enhanced with LTV, LTV:CAC, Projected Revenue)
// ---------------------------------------------------------------------------

const MrrPanel = memo(function MrrPanel() {
  const { data, isLoading, refetch, isFetching } = useSubscriptionAnalytics();
  const { data: businessData } = useBusinessMetrics();

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

  // LTV & LTV:CAC
  const ltv = businessData?.ltv ?? (arpu > 0 ? arpu * 12 : 0);
  const ltvCacRatio = businessData?.ltvCacRatio ?? 0;
  const ltvCacLevel = ltvCacRatio > 0 ? getBenchmarkLevel('ltvCac', ltvCacRatio) : 'poor';

  // Projected revenue (linear projection 12mo)
  const monthlyGrowthRate = mrrGrowth / 100;
  const projectedAnnualRevenue = mrr > 0
    ? Array.from({ length: 12 }, (_, i) => mrr * Math.pow(1 + monthlyGrowthRate, i + 1)).reduce((a, b) => a + b, 0)
    : 0;

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
          <p className="text-xs text-gray-400 mt-1">Annual run rate</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">MRR Growth</p>
          <p className={`text-2xl font-bold mt-1 ${mrrGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {mrrGrowth >= 0 ? '+' : ''}{mrrGrowth}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Month over month</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">ARPU</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(arpu)}</p>
          <p className="text-xs text-gray-400 mt-1">Per paying user</p>
        </div>
      </div>

      {/* LTV, LTV:CAC, Projected Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">Customer LTV</p>
          <p className="text-2xl font-bold text-white mt-1">
            {ltv > 0 ? formatCurrencyPrecise(ltv) : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lifetime value estimate</p>
        </div>

        <div className={`rounded-lg p-5 border border-gray-700 ${ltvCacRatio > 0 ? getBenchmarkBgColor(ltvCacLevel) : 'bg-gray-800'}`}>
          <p className="text-sm font-medium text-gray-400">LTV:CAC Ratio</p>
          <p className={`text-2xl font-bold mt-1 ${ltvCacRatio > 0 ? getBenchmarkColor(ltvCacLevel) : 'text-white'}`}>
            {ltvCacRatio > 0 ? `${ltvCacRatio.toFixed(1)}:1` : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {ltvCacRatio > 0 ? `Benchmark: ${ltvCacLevel}` : 'Awaiting CAC data'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-400">Projected Revenue (12mo)</p>
          <p className="text-2xl font-bold text-white mt-1">
            {projectedAnnualRevenue > 0 ? formatCurrency(projectedAnnualRevenue) : '--'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {mrr > 0 ? `At ${mrrGrowth >= 0 ? '+' : ''}${mrrGrowth}% MoM growth` : 'Linear projection'}
          </p>
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

// ---------------------------------------------------------------------------
// Waterfall Panel
// ---------------------------------------------------------------------------

const WaterfallPanel = memo(function WaterfallPanel() {
  const { data: businessData, isLoading } = useBusinessMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const waterfall = businessData?.mrrWaterfall ?? [];
  const lastSix = waterfall.slice(-6);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-white">MRR Waterfall (Last 6 Months)</h3>
        </div>

        {lastSix.length > 0 ? (
          <div className="space-y-4">
            {lastSix.map((month) => {
              const maxVal = Math.max(month.endingMrr, month.startingMrr, 1);
              return (
                <div key={month.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{month.month}</span>
                    <span className="text-sm text-gray-400">
                      {formatCurrency(month.startingMrr)} &rarr; {formatCurrency(month.endingMrr)}
                    </span>
                  </div>
                  <div className="flex h-6 rounded overflow-hidden gap-0.5">
                    {/* Starting MRR base */}
                    <div
                      className="bg-gray-600 rounded-l"
                      style={{ width: `${(month.startingMrr / maxVal) * 40}%` }}
                      title={`Starting: ${formatCurrency(month.startingMrr)}`}
                    />
                    {/* New MRR */}
                    {month.newMrr > 0 && (
                      <div
                        className="bg-green-500"
                        style={{ width: `${Math.max((month.newMrr / maxVal) * 40, 2)}%` }}
                        title={`New: +${formatCurrency(month.newMrr)}`}
                      />
                    )}
                    {/* Expansion */}
                    {month.expansionMrr > 0 && (
                      <div
                        className="bg-blue-500"
                        style={{ width: `${Math.max((month.expansionMrr / maxVal) * 40, 2)}%` }}
                        title={`Expansion: +${formatCurrency(month.expansionMrr)}`}
                      />
                    )}
                    {/* Contraction */}
                    {month.contractionMrr > 0 && (
                      <div
                        className="bg-orange-500"
                        style={{ width: `${Math.max((month.contractionMrr / maxVal) * 40, 2)}%` }}
                        title={`Contraction: -${formatCurrency(month.contractionMrr)}`}
                      />
                    )}
                    {/* Churn */}
                    {month.churnedMrr > 0 && (
                      <div
                        className="bg-red-500 rounded-r"
                        style={{ width: `${Math.max((month.churnedMrr / maxVal) * 40, 2)}%` }}
                        title={`Churn: -${formatCurrency(month.churnedMrr)}`}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-green-500 inline-block" />
                      +{formatCurrency(month.newMrr)} new
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-blue-500 inline-block" />
                      +{formatCurrency(month.expansionMrr)} expansion
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-orange-500 inline-block" />
                      -{formatCurrency(month.contractionMrr)} contraction
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-red-500 inline-block" />
                      -{formatCurrency(month.churnedMrr)} churn
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No waterfall data available yet</p>
            <p className="text-xs mt-1">MRR waterfall will appear once subscription history accumulates</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-orange-900/20 rounded-lg">
        <p className="text-sm text-orange-300">
          <strong>Reading the waterfall:</strong> Each month shows how MRR changes from starting to ending value.
          Green = new subscriptions, Blue = upgrades, Orange = downgrades, Red = cancellations.
        </p>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Revenue Cohorts Panel
// ---------------------------------------------------------------------------

const RevenueCohortsPanel = memo(function RevenueCohortsPanel() {
  const { data: businessData, isLoading } = useBusinessMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cohorts = businessData?.revenueByCohort ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-white">Revenue by Signup Cohort</h3>
        </div>

        {cohorts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="pb-3 pr-4">Cohort Month</th>
                  <th className="pb-3 px-2 text-center">Users</th>
                  <th className="pb-3 px-2 text-right">Current MRR</th>
                  <th className="pb-3 px-2 text-right">ARPU</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="border-t border-gray-700">
                    <td className="py-3 pr-4 font-medium">{cohort.cohortMonth}</td>
                    <td className="py-3 px-2 text-center">{cohort.users}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-medium">
                      {formatCurrency(cohort.currentMrr)}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-400">
                      {cohort.users > 0 ? formatCurrencyPrecise(cohort.currentMrr / cohort.users) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-600 rounded-lg">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No revenue cohort data yet</p>
            <p className="text-xs mt-1">Cohort revenue will appear as paid subscriptions accumulate</p>
          </div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Conversions Panel
// ---------------------------------------------------------------------------

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
          <p className="text-xs text-gray-400 mt-1">Conversion rate</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-gray-400">Upgrades</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {recentEvents?.upgraded || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-500 rotate-180" />
            <span className="text-sm font-medium text-gray-400">Downgrades</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {recentEvents?.downgraded || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">This month</p>
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

      {/* LTV Metrics */}
      <div className="bg-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Customer Lifetime Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">LTV</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalSubscribers > 0 ? formatCurrency((metrics?.arpu ?? 0) * 12) : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Estimated (ARPU x 12)</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">Churn Rate</p>
            <p className="text-2xl font-bold text-white mt-1">
              {metrics?.churnRate !== undefined ? `${metrics.churnRate}%` : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Monthly</p>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-400">Net Subscriber Growth</p>
            <p className={`text-2xl font-bold mt-1 ${(metrics?.netGrowth || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics?.netGrowth !== undefined ? (metrics.netGrowth >= 0 ? `+${metrics.netGrowth}` : metrics.netGrowth) : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">This month</p>
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

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/** Renders revenue metrics, MRR trends, and subscription analytics. */
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
        {activeSubTab === 'waterfall' && <WaterfallPanel />}
        {activeSubTab === 'cohorts' && <RevenueCohortsPanel />}
      </div>
    </div>
  );
});
