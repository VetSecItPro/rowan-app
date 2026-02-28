'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  DollarSign,
  Users,
  Percent,
  TrendingDown,
  Crown,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

interface SubscriptionMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  totalSubscribers: number;
  proSubscribers: number;
  familySubscribers: number;
  freeUsers: number;
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
    mrr: number;
  }[];
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

interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: string;
  fromTier: string | null;
  toTier: string | null;
  createdAt: string;
  userEmail?: string;
}

const EventBadge = memo(function EventBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    subscription_created: { bg: 'bg-green-900/30', text: 'text-green-400', icon: CheckCircle },
    subscription_upgraded: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: ArrowUpRight },
    subscription_downgraded: { bg: 'bg-orange-900/30', text: 'text-orange-400', icon: ArrowDownRight },
    subscription_cancelled: { bg: 'bg-red-900/30', text: 'text-red-400', icon: XCircle },
    payment_failed: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: AlertCircle },
  };

  const { bg, text, icon: Icon } = config[type] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: CreditCard };
  const label = type.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});

/** Displays subscription tier distribution and plan management data. */
export const SubscriptionsPanel = memo(function SubscriptionsPanel() {
  const [activeView, setActiveView] = useState<'overview' | 'events'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // React Query for subscription analytics with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-subscription-analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/subscription-analytics?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch subscription analytics');
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const metrics: SubscriptionMetrics | null = data?.metrics || null;
  const events: SubscriptionEvent[] = data?.events?.events || [];

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
    barColors?: string[];
    formatter?: (value: number) => string;
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const openDrillDown = (metric: string) => {
    if (!metrics) return;
    let data: DrillDownDataPoint[] = [];
    let title = '';
    let color = '#10b981';
    let barColors: string[] | undefined;
    let formatter: ((value: number) => string) | undefined;

    const currencyFormatter = (v: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

    switch (metric) {
      case 'mrr':
        data = (metrics.tierDistribution ?? []).map((t) => ({
          date: t.tier,
          value: t.mrr,
        }));
        title = 'MRR by Tier';
        color = '#10b981';
        barColors = ['#3b82f6', '#a855f7', '#f59e0b', '#06b6d4'];
        formatter = currencyFormatter;
        break;
      case 'subscribers':
        data = (metrics.tierDistribution ?? []).map((t) => ({
          date: t.tier,
          value: t.count,
        }));
        if (metrics.freeUsers > 0) {
          data.push({ date: 'Free', value: metrics.freeUsers });
        }
        title = 'Subscribers by Tier';
        color = '#8b5cf6';
        barColors = ['#3b82f6', '#a855f7', '#6b7280', '#f59e0b'];
        break;
      case 'conversion':
        data = [{ date: 'Conversion Rate', value: metrics.conversionRate }];
        title = 'Free to Paid Conversion';
        color = '#3b82f6';
        formatter = (v: number) => `${v}%`;
        break;
      case 'churn':
        data = [{ date: 'Churn Rate', value: metrics.churnRate }];
        title = 'Monthly Churn Rate';
        color = metrics.churnRate > 5 ? '#ef4444' : '#10b981';
        formatter = (v: number) => `${v}%`;
        break;
      case 'thisMonth':
        data = [
          { date: 'New', value: metrics.recentEvents?.created ?? 0 },
          { date: 'Cancelled', value: metrics.recentEvents?.cancelled ?? 0 },
          { date: 'Net Growth', value: metrics.netGrowth ?? 0 },
        ];
        title = 'This Month — Subscription Activity';
        barColors = ['#10b981', '#ef4444', (metrics.netGrowth ?? 0) >= 0 ? '#34d399' : '#f87171'];
        break;
    }

    if (data.length > 0) {
      setDrillDown({ isOpen: true, title, metric, data, color, chartType: 'bar', barColors, formatter });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading subscriptions...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No subscription data available</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* View Toggle & Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'overview'
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('events')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeView === 'events'
                ? 'bg-emerald-900/30 text-emerald-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Events ({events.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-0.5">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7d' : range === '30d' ? '30d' : '90d'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeView === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-emerald-500/30 transition-all"
              onClick={() => openDrillDown('mrr')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrillDown('mrr'); } }}
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <DollarSign className="w-3 h-3" />
                MRR
              </div>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(metrics.mrr)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                ARR: {formatCurrency(metrics.arr)}
              </p>
            </div>
            <div
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-purple-500/30 transition-all"
              onClick={() => openDrillDown('subscribers')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrillDown('subscribers'); } }}
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Users className="w-3 h-3" />
                Subscribers
              </div>
              <p className="text-xl font-bold text-white">
                {metrics.totalSubscribers}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                ARPU: {formatCurrency(metrics.arpu)}
              </p>
            </div>
            <div
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-blue-500/30 transition-all"
              onClick={() => openDrillDown('conversion')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrillDown('conversion'); } }}
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <Percent className="w-3 h-3" />
                Conversion
              </div>
              <p className="text-xl font-bold text-blue-400">
                {metrics.conversionRate}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Free to paid</p>
            </div>
            <div
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-red-500/30 transition-all"
              onClick={() => openDrillDown('churn')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrillDown('churn'); } }}
            >
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <TrendingDown className="w-3 h-3" />
                Churn
              </div>
              <p className={`text-xl font-bold ${metrics.churnRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
                {metrics.churnRate}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">This month</p>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-white">Subscription Tiers</span>
              </div>
              <div className="space-y-3">
                {(metrics.tierDistribution ?? []).map((tier) => (
                  <div key={tier.tier} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{tier.tier}</span>
                      <span className="text-gray-400">
                        {tier.count} ({formatCurrency(tier.mrr)}/mo)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          tier.tier === 'Pro' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${tier.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-700 text-sm">
                  <span className="text-gray-400">Free: {metrics.freeUsers}</span>
                </div>
              </div>
            </div>

            {/* This Month Activity */}
            <div
              className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-blue-500/30 transition-all"
              onClick={() => openDrillDown('thisMonth')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrillDown('thisMonth'); } }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-white">This Month</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {metrics.recentEvents?.created ?? 0}
                  </p>
                  <p className="text-xs text-gray-400">New</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {metrics.recentEvents?.cancelled ?? 0}
                  </p>
                  <p className="text-xs text-gray-400">Cancelled</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${(metrics.netGrowth ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(metrics.netGrowth ?? 0) >= 0 ? '+' : ''}{metrics.netGrowth ?? 0}
                  </p>
                  <p className="text-xs text-gray-400">Net</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm font-medium text-blue-400">{metrics.recentEvents?.upgraded ?? 0}</p>
                  <p className="text-xs text-gray-400">Upgraded</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-400">{metrics.recentEvents?.downgraded ?? 0}</p>
                  <p className="text-xs text-gray-400">Downgraded</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-400">{metrics.recentEvents?.paymentFailed ?? 0}</p>
                  <p className="text-xs text-gray-400">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeView === 'events' && (
        <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-700">
            {events.length > 0 ? (
              events.slice(0, 15).map((event) => (
                <div key={event.id} className="p-3 hover:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <EventBadge type={event.eventType} />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {event.userEmail || event.userId.slice(0, 8) + '...'}
                        </p>
                        {event.fromTier && event.toTier && (
                          <p className="text-xs text-gray-400">
                            {event.fromTier} → {event.toTier}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No subscription events yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
        subtitle={`${timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}`}
      >
        <DrillDownChart
          data={drillDown.data}
          metric={drillDown.metric}
          color={drillDown.color}
          chartType={drillDown.chartType}
          barColors={drillDown.barColors}
          formatter={drillDown.formatter}
        />
      </DrillDownModal>
    </div>
  );
});
