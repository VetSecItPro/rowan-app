'use client';

import { useState, memo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  MessageSquare,
  CreditCard,
  Layers,
  Clock,
  UserPlus,
  HeartPulse,
  Download,
  GitBranch,
  LayoutDashboard,
  Zap,
  DollarSign,
  Settings,
  type LucideIcon
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// Import content panels for tabbed management console
import {
  UsersPanel,
  OverviewPanel,
  GrowthPanel,
  EngagementPanel,
  RetentionPanel,
  RevenuePanel,
  SystemPanel,
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

interface ActivityItem {
  id: string;
  type: 'user_signup' | 'beta_granted' | 'beta_feedback' | 'feedback';
  title: string;
  description: string;
  timestamp: string;
  email?: string;
}

type TabId = 'overview' | 'users' | 'growth' | 'engagement' | 'retention' | 'revenue' | 'feedback' | 'system';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
  color: string;
  description?: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-blue-500', description: 'Key metrics at a glance' },
  { id: 'users', label: 'Users', icon: Users, color: 'text-indigo-500', description: 'User management' },
  { id: 'growth', label: 'Growth', icon: TrendingUp, color: 'text-green-500', description: 'Acquisition & funnel' },
  { id: 'engagement', label: 'Engagement', icon: Zap, color: 'text-cyan-500', description: 'Traffic & features' },
  { id: 'retention', label: 'Retention', icon: Activity, color: 'text-purple-500', description: 'DAU/MAU & cohorts' },
  { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-orange-500', description: 'Subscriptions & MRR' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-pink-500', description: 'Beta user feedback' },
  { id: 'system', label: 'System', icon: Settings, color: 'text-gray-500', description: 'Health & settings' },
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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL or default to 'overview'
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const validTabs: TabId[] = ['overview', 'users', 'growth', 'engagement', 'retention', 'revenue', 'feedback', 'system'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'overview';

  const [activeTab, setActiveTabState] = useState<TabId | null>(initialTab);

  // Update URL when tab changes
  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

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

  // Fetch recent activity data
  const { data: activityData } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/admin/activity?limit=6&hours=24');
      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      return data.activities as ActivityItem[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  // Helper to format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get icon and colors for activity type
  const getActivityConfig = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_signup':
        return {
          icon: UserPlus,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'beta_granted':
        return {
          icon: Shield,
          iconBg: 'bg-purple-100 dark:bg-purple-900/30',
          iconColor: 'text-purple-600 dark:text-purple-400',
        };
      case 'beta_feedback':
      case 'feedback':
        return {
          icon: MessageSquare,
          iconBg: 'bg-pink-100 dark:bg-pink-900/30',
          iconColor: 'text-pink-600 dark:text-pink-400',
        };
      default:
        return {
          icon: Activity,
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  // Render the active panel content
  const renderPanel = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPanel />;
      case 'users':
        return <UsersPanel />;
      case 'growth':
        return <GrowthPanel />;
      case 'engagement':
        return <EngagementPanel />;
      case 'retention':
        return <RetentionPanel />;
      case 'revenue':
        return <RevenuePanel />;
      case 'feedback':
        return <BetaFeedbackPanel />;
      case 'system':
        return <SystemPanel />;
      default:
        return <OverviewPanel />;
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
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
              <ThemeToggle />
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
              value={stats.totalUsers ?? 0}
              icon={Users}
              color="blue"
              trend={(stats.totalUsers ?? 0) > 0 ? "up" : undefined}
              trendValue={(stats.totalUsers ?? 0) > 0 ? "Growing" : undefined}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers ?? 0}
              icon={UserCheck}
              color="green"
              trend={(stats.activeUsers ?? 0) > 0 ? "up" : undefined}
              trendValue={(stats.activeUsers ?? 0) > 0 ? "Active" : undefined}
            />
            <StatCard
              title="Beta Users"
              value={`${stats.betaUsers ?? 0}/100`}
              icon={Shield}
              color="purple"
              trend={(stats.betaUsers ?? 0) > 0 ? "up" : undefined}
              trendValue={(stats.betaUsers ?? 0) < 100 ? `${100 - (stats.betaUsers ?? 0)} slots left` : "Full"}
            />
            <StatCard
              title="Launch Signups"
              value={stats.launchSignups ?? 0}
              icon={Mail}
              color="orange"
              trend={(stats.launchSignups ?? 0) > 0 ? "up" : undefined}
              trendValue={(stats.launchSignups ?? 0) > 0 ? "Interested" : undefined}
            />
            <StatCard
              title="Beta Requests"
              value={stats.betaRequestsToday ?? 0}
              icon={Activity}
              color="red"
              trend={(stats.betaRequestsToday ?? 0) > 0 ? "neutral" : undefined}
              trendValue={(stats.betaRequestsToday ?? 0) > 0 ? "Today" : undefined}
            />
            <StatCard
              title="Signups Today"
              value={stats.signupsToday ?? 0}
              icon={TrendingUp}
              color="gray"
              trend={(stats.signupsToday ?? 0) > 0 ? "up" : undefined}
              trendValue={(stats.signupsToday ?? 0) > 0 ? "Today" : undefined}
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
            <button
              onClick={() => setActiveTab('system')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Details
            </button>
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
                <p className="text-xs text-gray-500">{stats?.betaUsers ?? 0}/100</p>
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
            {activityData && activityData.length > 0 ? (
              activityData.map((activity) => {
                const config = getActivityConfig(activity.type);
                return (
                  <ActivityItem
                    key={activity.id}
                    icon={config.icon}
                    title={activity.title}
                    description={activity.description}
                    time={formatRelativeTime(activity.timestamp)}
                    iconBg={config.iconBg}
                    iconColor={config.iconColor}
                  />
                );
              })
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
          {/* Console Header */}
          <div className="bg-indigo-600 dark:bg-indigo-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Management Console
            </h2>
          </div>
          {/* Tab Navigation - Centered */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-2">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center justify-center gap-1 overflow-x-auto scrollbar-hide pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {TABS.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>
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
