'use client';

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  Mail,
  TrendingUp,
  Shield,
  Activity,
  Download,
  RefreshCw,
  Monitor,
  BarChart3,
  Sun,
  Moon,
  ArrowLeft,
  MessageSquare,
  CreditCard,
  Layers,
  type LucideIcon
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  betaUsers: number;
  launchSignups: number;
  betaRequestsToday: number;
  signupsToday: number;
}

// Memoized StatCard component - prevents re-renders when other stats change
const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue'
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              <TrendingUp className={`w-4 h-4 mr-1 ${
                trend === 'up' ? 'text-green-500 rotate-0' :
                trend === 'down' ? 'text-red-500 rotate-180' :
                'text-gray-500'
              }`} />
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-600' :
                trend === 'down' ? 'text-red-600' :
                'text-gray-600'
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

// Memoized QuickAction component - Professional minimal design
const QuickAction = memo(function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  iconColor = 'text-gray-600 dark:text-gray-400'
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  iconColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-200 text-left group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform duration-200`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
});

// Skeleton loader for stats grid
const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
});

export default function AdminDashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch with theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use React Query with stale-while-revalidate for instant loading
  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      // Add cache-busting param to force fresh data from server
      const response = await fetch(`/api/admin/dashboard/stats?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.stats as DashboardStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (matches server cache)
    gcTime: 15 * 60 * 1000, // 15 minutes in cache
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes in background
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Back to Rowan App"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to App</span>
              </a>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Operations Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Rowan App Beta Launch Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid - Show skeleton while loading */}
        {isLoading || !stats ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="blue"
              trend={stats.totalUsers > 0 ? "up" : undefined}
              trendValue={stats.totalUsers > 0 ? "Growing" : undefined}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              icon={UserCheck}
              color="green"
              trend={stats.activeUsers > 0 ? "up" : undefined}
              trendValue={stats.activeUsers > 0 ? "Active" : undefined}
            />
            <StatCard
              title="Beta Users"
              value={`${stats.betaUsers}/30`}
              icon={Shield}
              color="purple"
              trend={stats.betaUsers > 0 ? "up" : undefined}
              trendValue={stats.betaUsers < 30 ? `${30 - stats.betaUsers} slots left` : "Full"}
            />
            <StatCard
              title="Launch Signups"
              value={stats.launchSignups}
              icon={Mail}
              color="orange"
              trend={stats.launchSignups > 0 ? "up" : undefined}
              trendValue={stats.launchSignups > 0 ? "Interested" : undefined}
            />
            <StatCard
              title="Beta Requests Today"
              value={stats.betaRequestsToday}
              icon={Activity}
              color="red"
              trend={stats.betaRequestsToday > 0 ? "neutral" : undefined}
              trendValue={stats.betaRequestsToday > 0 ? "Today" : undefined}
            />
            <StatCard
              title="Signups Today"
              value={stats.signupsToday}
              icon={TrendingUp}
              color="gray"
              trend={stats.signupsToday > 0 ? "up" : undefined}
              trendValue={stats.signupsToday > 0 ? "Today" : undefined}
            />
          </div>
        )}

        {/* Content Grid - Side by side layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions - Left Column */}
          <div className="lg:col-span-1 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2 flex-1">
              <QuickAction
                title="User Management"
                description="View and manage all registered users"
                icon={Users}
                iconColor="text-blue-600 dark:text-blue-400"
                onClick={() => router.push('/admin/users')}
              />
              <QuickAction
                title="Beta Program"
                description="Monitor beta access requests and users"
                icon={Shield}
                iconColor="text-purple-600 dark:text-purple-400"
                onClick={() => router.push('/admin/users?tab=beta')}
              />
              <QuickAction
                title="Launch Notifications"
                description="Manage launch notification subscribers"
                icon={Mail}
                iconColor="text-green-600 dark:text-green-400"
                onClick={() => router.push('/admin/notifications')}
              />
              <QuickAction
                title="Analytics Dashboard"
                description="View comprehensive usage analytics"
                icon={BarChart3}
                iconColor="text-cyan-600 dark:text-cyan-400"
                onClick={() => router.push('/admin/analytics')}
              />
              <QuickAction
                title="Subscription Analytics"
                description="Revenue metrics, MRR, and subscriber data"
                icon={CreditCard}
                iconColor="text-emerald-600 dark:text-emerald-400"
                onClick={() => router.push('/admin/subscriptions')}
              />
              <QuickAction
                title="Feature Usage"
                description="Track which features users interact with"
                icon={Layers}
                iconColor="text-amber-600 dark:text-amber-400"
                onClick={() => router.push('/admin/feature-usage')}
              />
              <QuickAction
                title="Beta Feedback"
                description="View and manage beta tester feedback"
                icon={MessageSquare}
                iconColor="text-indigo-600 dark:text-indigo-400"
                onClick={() => router.push('/admin/beta-feedback')}
              />
              <QuickAction
                title="User Feedback"
                description="View all user feedback and issues"
                icon={MessageSquare}
                iconColor="text-pink-600 dark:text-pink-400"
                onClick={() => router.push('/admin/feedback')}
              />
              <QuickAction
                title="System Health"
                description="Monitor system performance and status"
                icon={Monitor}
                iconColor="text-emerald-600 dark:text-emerald-400"
                onClick={() => router.push('/admin/health')}
              />
              <QuickAction
                title="Export Data"
                description="Download user data and analytics"
                icon={Download}
                iconColor="text-slate-600 dark:text-slate-400"
                onClick={() => window.open('/api/admin/export/users', '_blank')}
              />
            </div>
          </div>

          {/* Recent Activity - Right Column (Full Height) */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              <div className="flex-1 flex items-center justify-center">
                {stats && stats.totalUsers > 0 ? (
                  // Real activity data would go here when available
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Recent activity will appear here as beta users start using the platform
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No recent activity yet
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Activity feed will populate as users interact with the platform
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                System Status
              </h3>
              <button
                onClick={() => router.push('/admin/health')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <Monitor className="w-4 h-4" />
                View Details
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Database</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">API Services</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Running smoothly</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Rate Limiting</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active (normal)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Beta Program</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{`${stats?.betaUsers ?? 0}/30 active`}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}