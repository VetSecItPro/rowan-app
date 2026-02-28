'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  RefreshCw,
  Activity,
  Home,
} from 'lucide-react';
import { DrillDownModal } from '@/components/admin/DrillDownModal';
import { DrillDownChart, type DrillDownDataPoint } from '@/components/admin/DrillDownChart';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  last_sign_in_at: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

type SubTab = 'list' | 'lifecycle' | 'spaces';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'list', label: 'User List', icon: Users },
  { id: 'lifecycle', label: 'Lifecycle', icon: Activity },
  { id: 'spaces', label: 'Spaces', icon: Home },
];

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; icon: typeof UserCheck }> = {
    active: { bg: 'bg-green-900/30', text: 'text-green-400', icon: UserCheck },
    inactive: { bg: 'bg-gray-700', text: 'text-gray-400', icon: UserX },
    suspended: { bg: 'bg-red-900/30', text: 'text-red-400', icon: UserX },
  };

  const config = statusConfig[status] || statusConfig.inactive;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
});

/** Original user list content, extracted as a sub-panel. */
const UserListPanel = memo(function UserListPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch all users (API supports page/limit params, use high limit to get all)
      const response = await adminFetch('/api/admin/users?page=1&limit=100');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return { users: data.users || [], total: data.pagination?.total ?? 0 };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const users: User[] = useMemo(() => usersData?.users || [], [usersData]);
  const totalUsers = usersData?.total ?? users.length;

  const fetchData = useCallback(() => {
    refetchUsers();
  }, [refetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const term = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        (user.email || '').toLowerCase().includes(term) ||
        (user.full_name || '').toLowerCase().includes(term);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && user.status === 'active') ||
        (filter === 'inactive' && user.status === 'inactive');
      return matchesSearch && matchesFilter;
    });
  }, [users, debouncedSearchTerm, filter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium px-3 py-1.5 rounded-lg bg-indigo-900/30 text-indigo-400">
            {totalUsers} Users
          </span>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="text-sm px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-indigo-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {user.full_name || user.email}
                          </p>
                          {user.full_name && (
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatDate(user.last_sign_in_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            )}
            {filteredUsers.length > 0 && filteredUsers.length < totalUsers && (
              <div className="p-3 text-center text-sm text-gray-400 border-t border-gray-700">
                Showing {filteredUsers.length} of {totalUsers} users (filtered)
              </div>
            )}
          </div>
        </div>
    </div>
  );
});

/** Lifecycle sub-panel showing user stages and time-to-value. */
const LifecyclePanel = memo(function LifecyclePanel() {
  const { data: lifecycleData, isLoading } = useQuery({
    queryKey: ['admin-user-lifecycle'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/user-lifecycle');
      if (!response.ok) throw new Error('Failed to fetch');
      return (await response.json()).lifecycle;
    },
    staleTime: 5 * 60 * 1000,
  });

  // All hooks must be declared before any early returns (Rules of Hooks)
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const stageCards = useMemo(() => {
    const stg = lifecycleData?.stages || {};
    return [
      { label: 'New', count: stg.new ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
      { label: 'Activated', count: stg.activated ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
      { label: 'Engaged', count: stg.engaged ?? 0, color: 'text-green-400', bg: 'bg-green-900/20' },
      { label: 'Power User', count: stg.power_user ?? 0, color: 'text-green-400', bg: 'bg-green-900/20' },
      { label: 'At-Risk', count: stg.at_risk ?? 0, color: 'text-red-400', bg: 'bg-red-900/20' },
      { label: 'Churned', count: stg.churned ?? 0, color: 'text-red-400', bg: 'bg-red-900/20' },
    ];
  }, [lifecycleData]);

  const openDrillDown = useCallback((metric: string) => {
    if (metric === 'stages') {
      const chartData: DrillDownDataPoint[] = stageCards.map(s => ({
        date: s.label,
        value: s.count,
      }));
      setDrillDown({
        isOpen: true,
        title: 'Lifecycle Stage Distribution',
        metric: 'Users',
        data: chartData,
        color: '#8b5cf6',
        chartType: 'bar',
      });
    }
  }, [stageCards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading lifecycle data...</span>
      </div>
    );
  }

  const timeToValue = lifecycleData?.timeToValue || {};
  const resurrectionRate = lifecycleData?.resurrectionRate ?? 0;

  return (
    <div className="space-y-6">
      {/* Lifecycle Stages */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Lifecycle Stages</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stageCards.map((stage) => (
            <div
              key={stage.label}
              className={`${stage.bg} rounded-lg p-4 text-center cursor-pointer hover:bg-gray-750 transition-colors`}
              onClick={() => openDrillDown('stages')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('stages'); }}
            >
              <p className="text-xs text-gray-400">{stage.label}</p>
              <p className={`text-2xl font-bold ${stage.color}`}>{stage.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Time to Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-3">Time to Value</h4>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Median Hours</p>
              <p className="text-2xl font-bold text-indigo-400">{timeToValue.medianHours ?? '--'}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Average Hours</p>
              <p className="text-2xl font-bold text-white">{timeToValue.averageHours ?? '--'}h</p>
            </div>
          </div>
        </div>

        {/* Resurrection Rate */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-white mb-3">Resurrection Rate</h4>
          <p className="text-3xl font-bold text-indigo-400">{resurrectionRate}%</p>
          <p className="text-xs text-gray-400 mt-2">Churned users who returned</p>
        </div>
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
      >
        <DrillDownChart
          data={drillDown.data}
          metric={drillDown.metric}
          color={drillDown.color}
          chartType={drillDown.chartType}
        />
      </DrillDownModal>
    </div>
  );
});

/** Spaces sub-panel showing space analytics and distribution. */
const SpacesPanel = memo(function SpacesPanel() {
  const { data: lifecycleData, isLoading } = useQuery({
    queryKey: ['admin-user-lifecycle'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/user-lifecycle');
      if (!response.ok) throw new Error('Failed to fetch');
      return (await response.json()).lifecycle;
    },
    staleTime: 5 * 60 * 1000,
  });

  // All hooks must be declared before any early returns (Rules of Hooks)
  const [drillDown, setDrillDown] = useState<{
    isOpen: boolean;
    title: string;
    metric: string;
    data: DrillDownDataPoint[];
    color?: string;
    chartType?: 'area' | 'bar';
  }>({ isOpen: false, title: '', metric: '', data: [] });

  const spaceAnalytics = lifecycleData?.spaceAnalytics || {};

  const distributionCards = useMemo(() => {
    const dist = spaceAnalytics.distribution || {};
    return [
      { label: 'Single User', count: dist.singleUser ?? 0, bg: 'bg-gray-800' },
      { label: '2-3 Members', count: dist.smallGroup ?? 0, bg: 'bg-gray-800' },
      { label: '4+ Members', count: dist.largeGroup ?? 0, bg: 'bg-gray-800' },
    ];
  }, [spaceAnalytics]);

  const openDrillDown = useCallback((metric: string) => {
    if (metric === 'distribution') {
      const chartData: DrillDownDataPoint[] = distributionCards.map(c => ({
        date: c.label,
        value: c.count,
      }));
      setDrillDown({
        isOpen: true,
        title: 'Space Size Distribution',
        metric: 'Spaces',
        data: chartData,
        color: '#6366f1',
        chartType: 'bar',
      });
    }
  }, [distributionCards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading space data...</span>
      </div>
    );
  }

  const avgMembers = spaceAnalytics.avgMembersPerSpace ?? 0;
  const mostActive = spaceAnalytics.mostActiveSpaces || [];

  return (
    <div className="space-y-6">
      {/* Avg Members */}
      <div
        className="bg-gray-800 rounded-lg p-5 text-center cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => openDrillDown('distribution')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('distribution'); }}
      >
        <p className="text-xs text-gray-400">Avg Members per Space</p>
        <p className="text-4xl font-bold text-indigo-400 mt-1">{avgMembers}</p>
      </div>

      {/* Distribution */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Space Size Distribution</h3>
        <div className="grid grid-cols-3 gap-3">
          {distributionCards.map((card) => (
            <div
              key={card.label}
              className={`${card.bg} rounded-lg p-4 text-center border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors`}
              onClick={() => openDrillDown('distribution')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDrillDown('distribution'); }}
            >
              <p className="text-xs text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{card.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Most Active Spaces */}
      {mostActive.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Most Active Spaces</h3>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Space Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Members</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Events (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {mostActive.slice(0, 5).map((space: { name: string; members: number; events: number }, i: number) => (
                  <tr key={i} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white font-medium">{space.name}</td>
                    <td className="px-4 py-3 text-gray-400">{space.members}</td>
                    <td className="px-4 py-3 text-gray-400">{space.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostActive.length === 0 && (
        <div className="p-4 bg-indigo-900/20 rounded-lg">
          <p className="text-sm text-indigo-300">
            Space activity data will populate as users create and interact within spaces.
          </p>
        </div>
      )}

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown(prev => ({ ...prev, isOpen: false }))}
        title={drillDown.title}
      >
        <DrillDownChart
          data={drillDown.data}
          metric={drillDown.metric}
          color={drillDown.color}
          chartType={drillDown.chartType}
        />
      </DrillDownModal>
    </div>
  );
});

/** Displays user management controls with search, filtering, and user details. */
export const UsersPanel = memo(function UsersPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('list');

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
                  ? 'border-indigo-500 text-indigo-400'
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
        {activeSubTab === 'list' && <UserListPanel />}
        {activeSubTab === 'lifecycle' && <LifecyclePanel />}
        {activeSubTab === 'spaces' && <SpacesPanel />}
      </div>
    </div>
  );
});
