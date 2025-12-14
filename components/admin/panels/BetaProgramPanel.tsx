'use client';

import { useState, useEffect, memo } from 'react';
import {
  Shield,
  Users,
  TrendingUp,
  Activity,
  Target,
  UserCheck,
  RefreshCw,
  Eye,
  Award,
  Search,
} from 'lucide-react';

interface BetaStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  activeUsers: number;
  capacity: number;
  conversionRate: number;
  averageActivityScore: number;
}

interface BetaUser {
  id: string;
  email: string;
  full_name: string | null;
  is_online: boolean;
  last_seen: string | null;
  beta_signup_date: string | null;
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  color = 'blue'
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
});

export const BetaProgramPanel = memo(function BetaProgramPanel() {
  const [stats, setStats] = useState<BetaStats>({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    activeUsers: 0,
    capacity: 30,
    conversionRate: 0,
    averageActivityScore: 0,
  });
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/beta/stats'),
        fetch('/api/admin/users/online')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prev => ({ ...prev, ...statsData.stats }));
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setBetaUsers(usersData.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch beta data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = betaUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading beta program...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {stats.activeUsers}/{stats.capacity} Users
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ({stats.capacity - stats.activeUsers} slots remaining)
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title="Total Requests"
          value={stats.totalRequests}
          subtitle="All time"
          color="blue"
        />
        <StatCard
          title="Conversion"
          value={`${stats.conversionRate}%`}
          subtitle="To active"
          color="green"
        />
        <StatCard
          title="Active Users"
          value={`${stats.activeUsers}/${stats.capacity}`}
          subtitle={`${Math.round((stats.activeUsers / stats.capacity) * 100)}% capacity`}
          color="purple"
        />
        <StatCard
          title="Avg Activity"
          value={stats.averageActivityScore.toFixed(1)}
          subtitle="Score"
          color="orange"
        />
        <StatCard
          title="Success Rate"
          value={`${Math.round((stats.approvedRequests / Math.max(stats.totalRequests, 1)) * 100)}%`}
          subtitle="Approved"
          color="red"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search beta users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
        />
      </div>

      {/* Users List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Beta Users</span>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {betaUsers.filter(u => u.is_online).length} online
            </div>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredUsers.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.slice(0, 10).map((user) => (
                <div key={user.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      {user.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || user.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.is_online ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Online</span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(user.last_seen)}
                      </span>
                    )}
                    <Award className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No beta users found</p>
            </div>
          )}
          {filteredUsers.length > 10 && (
            <div className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              Showing 10 of {filteredUsers.length} users
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
