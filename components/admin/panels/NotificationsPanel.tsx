'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Globe,
  Calendar,
  Users,
} from 'lucide-react';

interface LaunchNotification {
  id: string;
  name: string;
  email: string;
  source: string;
  subscribed: boolean;
  created_at: string;
  unsubscribed_at: string | null;
}

interface NotificationStats {
  total: number;
  subscribed: number;
  unsubscribed: number;
}

const StatusBadge = memo(function StatusBadge({ subscribed }: { subscribed: boolean }) {
  return subscribed ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 bg-green-900/30 text-green-400">
      <CheckCircle className="w-3 h-3 mr-1" />
      Subscribed
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
      <XCircle className="w-3 h-3 mr-1" />
      Unsubscribed
    </span>
  );
});

const SourceBadge = memo(function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    homepage: 'bg-blue-100 bg-blue-900/30 text-blue-400',
    beta: 'bg-purple-100 bg-purple-900/30 text-purple-400',
    referral: 'bg-green-100 bg-green-900/30 text-green-400',
    direct: 'bg-gray-700 text-gray-400',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[source] || colors.direct}`}>
      <Globe className="w-3 h-3 mr-1" />
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
});

export const NotificationsPanel = memo(function NotificationsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');

  // React Query for notifications with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-notifications', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const result = await response.json();
      return {
        notifications: result.notifications || [],
        pagination: result.pagination,
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const notifications: LaunchNotification[] = data?.notifications || [];

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Filter by search term
  const filteredNotifications = notifications.filter(notif =>
    (notif.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notif.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate stats
  const stats: NotificationStats = {
    total: notifications.length,
    subscribed: notifications.filter(n => n.subscribed).length,
    unsubscribed: notifications.filter(n => !n.subscribed).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-1">
            <Users className="w-3 h-3" />
            Total
          </div>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-green-900/20 rounded-lg p-4 text-center border border-green-800">
          <div className="flex items-center justify-center gap-2 text-xs text-green-400 mb-1">
            <CheckCircle className="w-3 h-3" />
            Subscribed
          </div>
          <p className="text-xl font-bold text-green-400">{stats.subscribed}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-1">
            <XCircle className="w-3 h-3" />
            Unsubscribed
          </div>
          <p className="text-xl font-bold text-gray-400">{stats.unsubscribed}</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['all', 'subscribed', 'unsubscribed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-green-100 bg-green-900/30 text-green-400'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-9 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white"
            />
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Signed Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredNotifications.slice(0, 15).map((notif) => (
                <tr key={notif.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-900/30 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="font-medium text-white truncate max-w-[200px]">
                        {notif.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {notif.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={notif.source} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge subscribed={notif.subscribed} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(notif.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredNotifications.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notifications found</p>
            </div>
          )}
          {filteredNotifications.length > 15 && (
            <div className="p-3 text-center text-sm text-gray-400 border-t border-gray-700">
              Showing 15 of {filteredNotifications.length} notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
