'use client';

import { useState, useEffect, memo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  Mail,
  TrendingUp,
  Shield,
  Activity,
  RefreshCw,
  Monitor,
  BarChart3,
  Sun,
  Moon,
  ArrowLeft,
  MessageSquare,
  CreditCard,
  Layers,
  ExternalLink,
  Clock,
  UserPlus,
  CheckCircle,
  Bell,
  HeartPulse,
  TestTube,
  Download,
  type LucideIcon
} from 'lucide-react';

// Import content panels for tabbed management console
import {
  UsersPanel,
  BetaProgramPanel,
  AnalyticsPanel,
  FeatureUsagePanel,
  FeedbackPanel,
  SubscriptionsPanel,
  BetaFeedbackPanel,
} from '@/components/admin/panels';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  betaUsers: number;
  launchSignups: number;
  betaRequestsToday: number;
  signupsToday: number;
}

type TabId = 'users' | 'beta' | 'notifications' | 'analytics' | 'subscriptions' | 'features' | 'beta-feedback' | 'feedback' | 'health' | 'export';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  color: string;
}

const TABS: Tab[] = [
  { id: 'users', label: 'Users', icon: Users, color: 'text-blue-500' },
  { id: 'beta', label: 'Beta', icon: Shield, color: 'text-purple-500' },
  { id: 'notifications', label: 'Launch', icon: Mail, color: 'text-green-500' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-cyan-500' },
  { id: 'subscriptions', label: 'Subs', icon: CreditCard, color: 'text-emerald-500' },
  { id: 'features', label: 'Features', icon: Layers, color: 'text-amber-500' },
  { id: 'beta-feedback', label: 'Beta FB', icon: TestTube, color: 'text-violet-500' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-pink-500' },
  { id: 'health', label: 'Health', icon: HeartPulse, color: 'text-red-500' },
  { id: 'export', label: 'Export', icon: Download, color: 'text-gray-500' },
];

// Memoized StatCard component
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center mt-1">
              <TrendingUp className={`w-3 h-3 mr-1 ${
                trend === 'up' ? 'text-green-500 rotate-0' :
                trend === 'down' ? 'text-red-500 rotate-180' :
                'text-gray-500'
              }`} />
              <span className={`text-xs ${
                trend === 'up' ? 'text-green-600' :
                trend === 'down' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
});

// Activity Item component
const ActivityItem = memo(function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  iconBg = 'bg-blue-100 dark:bg-blue-900/30',
  iconColor = 'text-blue-600 dark:text-blue-400'
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
        <Clock className="w-3 h-3" />
        {time}
      </div>
    </div>
  );
});

// Tab Button component - Compact horizontal design
const TabButton = memo(function TabButton({
  tab,
  isActive,
  onClick
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
        isActive
          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ''}`} />
      <span>{tab.label}</span>
    </button>
  );
});

// Skeleton loader for stats grid
const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
            </div>
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
});

function AdminDashboardContent() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // Get initial tab from URL or default to null (no default tab)
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const validTabs: TabId[] = ['users', 'beta', 'notifications', 'analytics', 'subscriptions', 'features', 'beta-feedback', 'feedback', 'health', 'export'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : null;

  const [activeTab, setActiveTabState] = useState<TabId | null>(initialTab);

  // Update URL when tab changes
  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Prevent hydration mismatch with theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use React Query with stale-while-revalidate for instant loading
  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/dashboard/stats?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.stats as DashboardStats;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Render the active panel content
  const renderPanel = () => {
    // If no tab is selected, show a welcome/select message
    if (!activeTab) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center h-full">
          <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Management Console</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Select a tab above to manage users, view analytics, handle feedback, and more.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'users':
        return <UsersPanel />;
      case 'beta':
        return <BetaProgramPanel />;
      case 'notifications':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Launch Notifications</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Manage launch notification subscribers</p>
            <Link href="/admin/notifications" className="text-blue-600 hover:underline text-sm">
              Open Full Page →
            </Link>
          </div>
        );
      case 'analytics':
        return <AnalyticsPanel />;
      case 'subscriptions':
        return <SubscriptionsPanel />;
      case 'features':
        return <FeatureUsagePanel />;
      case 'beta-feedback':
        return <BetaFeedbackPanel />;
      case 'feedback':
        return <FeedbackPanel />;
      case 'health':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HeartPulse className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">System Health</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Database, API, and service health monitoring</p>
            <Link href="/admin/health" className="text-blue-600 hover:underline text-sm">
              Open Full Page →
            </Link>
          </div>
        );
      case 'export':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Download className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Export Data</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Export user data and analytics</p>
            <Link href="/admin/health" className="text-blue-600 hover:underline text-sm">
              Open Full Page →
            </Link>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Back</span>
              </Link>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    Operations Dashboard
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4 flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
        {/* Row 1: Stats Cards */}
        {isLoading || !stats ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              trendValue={stats.betaUsers < 30 ? `${30 - stats.betaUsers} left` : "Full"}
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
              title="Beta Requests"
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

        {/* Row 2: System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-500" />
              System Status
            </h3>
            <Link
              href="/admin/health"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Details
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Database</p>
                <p className="text-xs text-gray-500">Operational</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">API</p>
                <p className="text-xs text-gray-500">Running</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Rate Limit</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Beta</p>
                <p className="text-xs text-gray-500">{stats?.betaUsers ?? 0}/30</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Recent Activity Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Recent Activity
            </h3>
            <span className="text-xs text-gray-500">Last 24 hours</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {stats && stats.totalUsers > 0 ? (
              <>
                <ActivityItem
                  icon={UserPlus}
                  title="New user signup"
                  description="john@example.com registered"
                  time="2m ago"
                  iconBg="bg-green-100 dark:bg-green-900/30"
                  iconColor="text-green-600 dark:text-green-400"
                />
                <ActivityItem
                  icon={Shield}
                  title="Beta access granted"
                  description="Beta request approved"
                  time="15m ago"
                  iconBg="bg-purple-100 dark:bg-purple-900/30"
                  iconColor="text-purple-600 dark:text-purple-400"
                />
                <ActivityItem
                  icon={CheckCircle}
                  title="Task completed"
                  description="User completed onboarding"
                  time="1h ago"
                  iconBg="bg-blue-100 dark:bg-blue-900/30"
                  iconColor="text-blue-600 dark:text-blue-400"
                />
                <ActivityItem
                  icon={MessageSquare}
                  title="New feedback"
                  description="Feature request submitted"
                  time="2h ago"
                  iconBg="bg-pink-100 dark:bg-pink-900/30"
                  iconColor="text-pink-600 dark:text-pink-400"
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                <Activity className="w-4 h-4 mr-2 opacity-50" />
                Activity will appear here as users interact with the platform
              </div>
            )}
          </div>
        </div>

        {/* Row 4: Management Console (Tabbed Content Area) - Fills remaining space */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
          {/* Tab Navigation - Horizontal Scrollable */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {TABS.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>
              {activeTab && (
                <Link
                  href={`/admin/${
                    activeTab === 'users' ? 'users' :
                    activeTab === 'beta' ? 'beta' :
                    activeTab === 'features' ? 'feature-usage' :
                    activeTab === 'beta-feedback' ? 'beta-feedback' :
                    activeTab === 'feedback' ? 'beta-feedback' :
                    activeTab === 'export' ? 'health' :
                    activeTab
                  }`}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="hidden sm:inline">Full Page</span>
                </Link>
              )}
            </div>
          </div>

          {/* Content Area - Fills remaining height */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
