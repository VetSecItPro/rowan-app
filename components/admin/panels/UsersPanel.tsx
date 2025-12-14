'use client';

import { useState, useEffect, memo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_beta: boolean;
  status: 'active' | 'inactive' | 'suspended';
}

interface BetaRequest {
  id: string;
  email: string;
  access_granted: boolean;
  created_at: string;
  user_id: string | null;
}

const StatusBadge = memo(function StatusBadge({ status, isBeta }: { status: string; isBeta: boolean }) {
  if (isBeta) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        <Shield className="w-3 h-3 mr-1" />
        Beta
      </span>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; icon: typeof UserCheck }> = {
    active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: UserCheck },
    inactive: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-400', icon: UserX },
    suspended: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: UserX },
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

export const UsersPanel = memo(function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [betaRequests, setBetaRequests] = useState<BetaRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'beta' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'beta'>('users');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [usersResponse, betaResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/beta-requests')
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      if (betaResponse.ok) {
        const betaData = await betaResponse.json();
        setBetaRequests(betaData.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'beta' && user.is_beta) ||
      (filter === 'active' && user.status === 'active') ||
      (filter === 'inactive' && user.status === 'inactive');
    return matchesSearch && matchesFilter;
  });

  const filteredBetaRequests = betaRequests.filter(request =>
    request.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('beta')}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'beta'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Beta Requests ({betaRequests.length})
          </button>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          />
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-sm px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="beta">Beta</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Sign In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.slice(0, 10).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} isBeta={user.is_beta} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(user.last_sign_in_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No users found</p>
              </div>
            )}
            {filteredUsers.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                Showing 10 of {filteredUsers.length} users
              </div>
            )}
          </div>
        </div>
      )}

      {/* Beta Requests Table */}
      {activeTab === 'beta' && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBetaRequests.slice(0, 10).map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                          {request.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {request.access_granted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <Mail className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(request.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBetaRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No beta requests found</p>
              </div>
            )}
            {filteredBetaRequests.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                Showing 10 of {filteredBetaRequests.length} requests
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
