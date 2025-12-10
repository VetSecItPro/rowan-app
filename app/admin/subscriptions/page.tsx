'use client';

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Crown,
  Percent,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  type LucideIcon
} from 'lucide-react';

interface SubscriptionMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  totalSubscribers: number;
  proSubscribers: number;
  familySubscribers: number;
  freeUsers: number;
  trialUsers: number;
  tierDistribution: {
    tier: string;
    count: number;
    percentage: number;
    mrr: number;
  }[];
  periodDistribution: {
    period: string;
    count: number;
    percentage: number;
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
  triggerSource: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  userEmail?: string;
}

interface DailyRevenueData {
  date: string;
  mrr: number;
  newMrr: number;
  churnedMrr: number;
  subscriptions: number;
  cancellations: number;
}

// Metric card component
const MetricCard = memo(function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'amber' | 'emerald';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 mr-1 text-green-500" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-4 h-4 mr-1 text-red-500" />
              ) : null}
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-600 dark:text-green-400' :
                trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
});

// Event type badge
const EventBadge = memo(function EventBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; icon: LucideIcon }> = {
    subscription_created: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    subscription_upgraded: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: ArrowUpRight },
    subscription_downgraded: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: ArrowDownRight },
    subscription_cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
    subscription_reactivated: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: RefreshCw },
    payment_failed: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: AlertCircle },
    trial_started: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Clock },
    trial_ended: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', icon: Clock },
  };

  const { bg, text, icon: Icon } = config[type] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: CreditCard };
  const label = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'revenue'>('overview');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/subscription-analytics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setEvents(data.events?.events || []);
        setDailyRevenue(data.dailyRevenue || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscription analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
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

  // Simple line chart component
  const RevenueChart = ({ data }: { data: DailyRevenueData[] }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No revenue data available
        </div>
      );
    }

    const maxMRR = Math.max(...data.map(d => d.mrr));
    const minMRR = Math.min(...data.map(d => d.mrr));
    const range = maxMRR - minMRR || 1;
    const width = 600;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + (1 - (d.mrr - minMRR) / range) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="overflow-visible">
          {/* Grid */}
          <defs>
            <pattern id="revenueGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#revenueGrid)" className="dark:opacity-20" />

          {/* Area fill */}
          <polygon
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill="url(#revenueGradient)"
            className="opacity-30"
          />
          <defs>
            <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            points={points}
            className="drop-shadow-sm"
          />

          {/* Y-axis labels */}
          <text x="10" y={padding} className="text-xs fill-gray-500" dominantBaseline="middle">
            {formatCurrency(maxMRR)}
          </text>
          <text x="10" y={height - padding} className="text-xs fill-gray-500" dominantBaseline="middle">
            {formatCurrency(minMRR)}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs currentPage="Subscriptions" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Subscription Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Revenue metrics and subscription tracking
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {(['overview', 'events', 'revenue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        ) : metrics ? (
          <div className="space-y-8">
            {activeTab === 'overview' && (
              <>
                {/* Key Revenue Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Monthly Recurring Revenue"
                    value={formatCurrency(metrics.mrr)}
                    subValue={`ARR: ${formatCurrency(metrics.arr)}`}
                    icon={DollarSign}
                    color="emerald"
                    trend={metrics.netGrowth > 0 ? 'up' : metrics.netGrowth < 0 ? 'down' : 'neutral'}
                    trendValue={`${metrics.netGrowth > 0 ? '+' : ''}${metrics.netGrowth} net this month`}
                  />
                  <MetricCard
                    title="Total Subscribers"
                    value={metrics.totalSubscribers}
                    subValue={`ARPU: ${formatCurrency(metrics.arpu)}`}
                    icon={Users}
                    color="blue"
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${metrics.conversionRate}%`}
                    subValue="Free to paid"
                    icon={Percent}
                    color="purple"
                    trend={metrics.conversionRate > 5 ? 'up' : 'neutral'}
                    trendValue={metrics.conversionRate > 5 ? 'Good' : 'Average'}
                  />
                  <MetricCard
                    title="Churn Rate"
                    value={`${metrics.churnRate}%`}
                    subValue="This month"
                    icon={TrendingDown}
                    color={metrics.churnRate > 5 ? 'red' : 'green'}
                    trend={metrics.churnRate > 5 ? 'down' : 'up'}
                    trendValue={metrics.churnRate > 5 ? 'High' : 'Healthy'}
                  />
                </div>

                {/* Subscriber Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tier Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Subscription Tiers
                    </h3>
                    <div className="space-y-4">
                      {metrics.tierDistribution.map((tier) => (
                        <div key={tier.tier} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tier.tier}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">{tier.count} subscribers</span>
                              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(tier.mrr)}/mo
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                tier.tier === 'Pro' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${tier.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {/* Free & Trial users */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Free Users</span>
                          <span className="font-medium text-gray-900 dark:text-white">{metrics.freeUsers}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Trial Users</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400">{metrics.trialUsers}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Period Distribution */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      Billing Periods
                    </h3>
                    <div className="space-y-4">
                      {metrics.periodDistribution.map((period) => (
                        <div key={period.period} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{period.period}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{period.count} subscribers</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{period.percentage}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                period.period === 'Annual' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${period.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Event Summary */}
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">This Month Activity</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {metrics.recentEvents.created}
                          </div>
                          <div className="text-xs text-gray-500">New</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {metrics.recentEvents.cancelled}
                          </div>
                          <div className="text-xs text-gray-500">Cancelled</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                            {metrics.recentEvents.paymentFailed}
                          </div>
                          <div className="text-xs text-gray-500">Failed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'events' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Subscription Events
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <EventBadge type={event.eventType} />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {event.userEmail || event.userId.slice(0, 8)}
                              </p>
                              {event.fromTier && event.toTier && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {event.fromTier} → {event.toTier}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(event.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No subscription events yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Events will appear here when users subscribe or modify their plans
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    MRR Trend (Last 30 Days)
                  </h3>
                  <RevenueChart data={dailyRevenue} />
                </div>

                {/* Daily Breakdown Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Revenue Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">MRR</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">New MRR</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Churned MRR</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subs</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancels</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {dailyRevenue.slice(-10).reverse().map((day) => (
                          <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{day.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(day.mrr)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">+{formatCurrency(day.newMrr)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">-{formatCurrency(day.churnedMrr)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{day.subscriptions}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{day.cancellations}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No subscription data available</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Metrics will appear once subscriptions are active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
