'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  Shield,
  Calendar,
  Download,
  RefreshCw,
  ArrowLeft,
  PieChart,
  Activity,
  Globe,
  Clock,
  Target
} from 'lucide-react';

interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number; betaUsers: number }>;
  signupTrends: Array<{ date: string; signups: number; notifications: number }>;
  betaMetrics: {
    conversionRate: number;
    approvalRate: number;
    retentionRate: number;
    averageActivityScore: number;
  };
  sourceDistribution: Array<{ source: string; count: number; percentage: number }>;
  activityHeatmap: Array<{ hour: number; day: string; activity: number }>;
  summary: {
    totalUsers: number;
    totalNotifications: number;
    totalBetaRequests: number;
    activeBetaUsers: number;
    growthRate: number;
    churnRate: number;
  };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userGrowth: [],
    signupTrends: [],
    betaMetrics: {
      conversionRate: 0,
      approvalRate: 0,
      retentionRate: 0,
      averageActivityScore: 0,
    },
    sourceDistribution: [],
    activityHeatmap: [],
    summary: {
      totalUsers: 0,
      totalNotifications: 0,
      totalBetaRequests: 0,
      activeBetaUsers: 0,
      growthRate: 0,
      churnRate: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const LineChart = ({ data, width = 400, height = 200, xKey, yKey, color = '#3B82F6' }: {
    data: Array<Record<string, number | string>>;
    width?: number;
    height?: number;
    xKey: string;
    yKey: string;
    color?: string;
  }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data available</div>;

    const maxY = Math.max(...data.map(d => Number(d[yKey])));
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + (1 - Number(d[yKey]) / maxY) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Chart line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          className="drop-shadow-sm"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = padding + (1 - Number(d[yKey]) / maxY) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              className="drop-shadow-sm"
            />
          );
        })}

        {/* Y-axis labels */}
        <text x="10" y={padding} className="text-xs fill-gray-500" dominantBaseline="middle">
          {maxY}
        </text>
        <text x="10" y={height - padding} className="text-xs fill-gray-500" dominantBaseline="middle">
          0
        </text>
      </svg>
    );
  };

  const BarChart = ({ data, width = 400, height = 200, xKey, yKey, color = '#10B981' }: {
    data: Array<Record<string, number | string>>;
    width?: number;
    height?: number;
    xKey: string;
    yKey: string;
    color?: string;
  }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data available</div>;

    const maxY = Math.max(...data.map(d => Number(d[yKey])));
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length * 0.8;

    return (
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid */}
        <defs>
          <pattern id="barGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#barGrid)" />

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + (i / data.length) * chartWidth + (chartWidth / data.length - barWidth) / 2;
          const barHeight = (Number(d[yKey]) / maxY) * chartHeight;
          const y = height - padding - barHeight;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              className="drop-shadow-sm"
              rx="2"
            />
          );
        })}

        {/* Y-axis labels */}
        <text x="10" y={padding} className="text-xs fill-gray-500" dominantBaseline="middle">
          {maxY}
        </text>
        <text x="10" y={height - padding} className="text-xs fill-gray-500" dominantBaseline="middle">
          0
        </text>
      </svg>
    );
  };

  const PieChartComponent = ({ data, width = 200, height = 200 }: {
    data: Array<{ label: string; value: number; color: string }>;
    width?: number;
    height?: number;
  }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data available</div>;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    let cumulativePercentage = 0;

    const slices = data.map((d) => {
      const percentage = d.value / total;
      const startAngle = cumulativePercentage * 2 * Math.PI;
      const endAngle = (cumulativePercentage + percentage) * 2 * Math.PI;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArc = percentage > 0.5 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      cumulativePercentage += percentage;

      return {
        pathData,
        color: d.color,
        label: d.label,
        value: d.value,
        percentage: (percentage * 100).toFixed(1),
      };
    });

    return (
      <div className="flex items-center gap-4">
        <svg width={width} height={height}>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              fill={slice.color}
              className="drop-shadow-sm hover:opacity-80 transition-opacity"
            />
          ))}
        </svg>
        <div className="space-y-2">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {slice.label}: {slice.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {change && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">{change}</p>
            )}
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Analytics Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Data insights and trends analysis
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={fetchAnalyticsData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={analyticsData.summary.totalUsers}
                change={analyticsData.summary.growthRate > 0 ? `+${analyticsData.summary.growthRate}% this month` : undefined}
                icon={Users}
                color="blue"
              />
              <MetricCard
                title="Beta Users"
                value={analyticsData.summary.activeBetaUsers}
                change={analyticsData.summary.activeBetaUsers > 0 ? "Active" : undefined}
                icon={Shield}
                color="purple"
              />
              <MetricCard
                title="Notification Signups"
                value={analyticsData.summary.totalNotifications}
                change={analyticsData.summary.totalNotifications > 0 ? "Subscribed" : undefined}
                icon={Mail}
                color="green"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${analyticsData.betaMetrics.conversionRate}%`}
                change={analyticsData.betaMetrics.conversionRate > 0 ? "Tracked" : undefined}
                icon={Target}
                color="orange"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Growth Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  User Growth Trends
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <LineChart
                    data={analyticsData.userGrowth}
                    width={500}
                    height={250}
                    xKey="date"
                    yKey="users"
                    color="#3B82F6"
                  />
                </div>
              </div>

              {/* Signup Sources */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Signup Sources
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <PieChartComponent
                    data={analyticsData.sourceDistribution.map((source, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
                      return {
                        label: source.source,
                        value: source.count,
                        color: colors[index % colors.length]
                      };
                    })}
                    width={250}
                    height={200}
                  />
                </div>
              </div>

              {/* Beta Program Performance */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Beta Program Metrics
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analyticsData.betaMetrics.approvalRate}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{analyticsData.betaMetrics.approvalRate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analyticsData.betaMetrics.retentionRate}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{analyticsData.betaMetrics.retentionRate}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Activity Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(analyticsData.betaMetrics.averageActivityScore / 10) * 100}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{analyticsData.betaMetrics.averageActivityScore}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Daily Activity
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <BarChart
                    data={analyticsData.activityHeatmap}
                    width={400}
                    height={250}
                    xKey="day"
                    yKey="activity"
                    color="#10B981"
                  />
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Insights
              </h3>
              {analyticsData.summary.totalUsers > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Growth Tracking</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Monitoring user growth patterns and engagement metrics as beta program progresses.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">Beta Program</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Tracking beta user onboarding, retention, and feedback for product improvements.
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">Data Collection</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Building comprehensive analytics foundation to guide product development decisions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Awaiting Data
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                    Key insights will appear here once beta testers begin using the platform and generating analytics data.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}