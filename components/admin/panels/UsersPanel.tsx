'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Mail,
  RefreshCw,
  Clock,
  Send,
  Check,
  Loader2,
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
  first_name: string | null;
  last_name: string | null;
  invite_code: string | null;
  access_granted: boolean;
  created_at: string;
  user_id: string | null;
}

const StatusBadge = memo(function StatusBadge({ status, isBeta }: { status: string; isBeta: boolean }) {
  if (isBeta) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 bg-purple-900/30 text-purple-400">
        <Shield className="w-3 h-3 mr-1" />
        Beta
      </span>
    );
  }

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

export const UsersPanel = memo(function UsersPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [filter, setFilter] = useState<'all' | 'beta' | 'active' | 'inactive'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'beta'>('users');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Handle resend invite email
  const handleResendInvite = useCallback(async (email: string) => {
    setResendingEmail(email);
    setResendSuccess(null);
    try {
      const response = await csrfFetch('/api/admin/beta/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend invite');
      }

      setResendSuccess(email);
      // Clear success state after 3 seconds
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (error) {
      console.error('Resend invite error:', error);
      alert(error instanceof Error ? error.message : 'Failed to resend invite');
    } finally {
      setResendingEmail(null);
    }
  }, []);

  // React Query for users with caching
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // State to force cache refresh
  const [forceRefresh, setForceRefresh] = useState(false);

  // React Query for beta requests with caching
  const { data: betaData, isLoading: betaLoading, refetch: refetchBeta } = useQuery({
    queryKey: ['admin-beta-requests', timeRange, forceRefresh],
    queryFn: async () => {
      const url = forceRefresh
        ? `/api/admin/beta-requests?refresh=true`
        : `/api/admin/beta-requests`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch beta requests');
      const data = await response.json();
      // Reset force refresh after successful fetch
      if (forceRefresh) setForceRefresh(false);
      return data.requests || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const users: User[] = useMemo(() => usersData || [], [usersData]);
  const betaRequests: BetaRequest[] = useMemo(() => betaData || [], [betaData]);
  const isLoading = usersLoading || betaLoading;

  const fetchData = useCallback(() => {
    setForceRefresh(true);
    refetchUsers();
    refetchBeta();
  }, [refetchUsers, refetchBeta]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = (user.email || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesFilter =
        filter === 'all' ||
        (filter === 'beta' && user.is_beta) ||
        (filter === 'active' && user.status === 'active') ||
        (filter === 'inactive' && user.status === 'inactive');
      return matchesSearch && matchesFilter;
    });
  }, [users, debouncedSearchTerm, filter]);

  const filteredBetaRequests = useMemo(() => {
    return betaRequests.filter(request =>
      (request.email || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [betaRequests, debouncedSearchTerm]);

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
        <span className="ml-3 text-sm text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-100 bg-blue-900/30 text-blue-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('beta')}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'beta'
                ? 'bg-purple-100 bg-purple-900/30 text-purple-400'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            Beta Requests ({betaRequests.length})
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-0.5">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7d' : range === '30d' ? '30d' : range === '90d' ? '90d' : 'All'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
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
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
          />
        </div>
        {activeTab === 'users' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-sm px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
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
        <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Last Sign In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.slice(0, 10).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="font-medium text-white">
                          {user.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} isBeta={user.is_beta} />
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
            {filteredUsers.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-400 border-t border-gray-700">
                Showing 10 of {filteredUsers.length} users
              </div>
            )}
          </div>
        </div>
      )}

      {/* Beta Requests Table */}
      {activeTab === 'beta' && (
        <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Code Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Conversion</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredBetaRequests.slice(0, 20).map((request) => (
                  <tr key={request.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <Shield className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="font-medium text-white">
                          {request.first_name && request.last_name
                            ? `${request.first_name} ${request.last_name}`
                            : request.first_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {request.email}
                    </td>
                    <td className="px-4 py-3">
                      {request.access_granted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 bg-green-900/30 text-green-400">
                          <Mail className="w-3 h-3 mr-1" />
                          Code Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 bg-yellow-900/30 text-yellow-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {request.user_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 bg-emerald-900/30 text-emerald-400">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Signed Up
                        </span>
                      ) : request.access_granted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 bg-orange-900/30 text-orange-400">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Signup
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {request.user_id ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <button
                          onClick={() => handleResendInvite(request.email)}
                          disabled={resendingEmail === request.email}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                            resendSuccess === request.email
                              ? 'bg-green-100 bg-green-900/30 text-green-400'
                              : 'bg-blue-100 bg-blue-900/30 text-blue-400 hover:bg-blue-800/40'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {resendingEmail === request.email ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Sending...
                            </>
                          ) : resendSuccess === request.email ? (
                            <>
                              <Check className="w-3 h-3" />
                              Sent!
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              Resend
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBetaRequests.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No beta requests found</p>
              </div>
            )}
            {filteredBetaRequests.length > 20 && (
              <div className="p-3 text-center text-sm text-gray-400 border-t border-gray-700">
                Showing 20 of {filteredBetaRequests.length} requests
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
