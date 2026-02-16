'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  ScrollText,
  Shield,
  CreditCard,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type SubTab = 'all' | 'admin' | 'subscription' | 'signup';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All Events', icon: ScrollText },
  { id: 'admin', label: 'Admin Actions', icon: Shield },
  { id: 'subscription', label: 'Subscriptions', icon: CreditCard },
  { id: 'signup', label: 'Signups', icon: UserPlus },
];

interface AuditEvent {
  id: string;
  category: 'admin' | 'subscription' | 'signup';
  actor: string;
  action: string;
  target: string;
  details: string | null;
  createdAt: string;
}

interface AuditTrailData {
  events: AuditEvent[];
  total: number;
  page: number;
  totalPages: number;
}

const CATEGORY_BADGE: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin: { bg: 'bg-amber-900/30', text: 'text-amber-400', icon: Shield },
  subscription: { bg: 'bg-green-900/30', text: 'text-green-400', icon: CreditCard },
  signup: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: UserPlus },
};

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function useAuditTrail(page: number, filter: string, search: string) {
  const [debouncedSearch] = useDebounce(search, 300);
  return useQuery<AuditTrailData>({
    queryKey: ['admin-audit-trail', page, filter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (filter !== 'all') params.set('action', filter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      const response = await adminFetch(`/api/admin/audit-trail?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');
      const data = await response.json();
      return data.auditTrail;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

const CategoryBadge = memo(function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_BADGE[category] || CATEGORY_BADGE.admin;
  const Icon = config.icon;
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});

const AuditEventRow = memo(function AuditEventRow({ event }: { event: AuditEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <tr className="border-t border-gray-700 hover:bg-gray-800/50 transition-colors">
      <td className="py-3 px-3 text-xs text-gray-400 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(event.createdAt)}
        </div>
      </td>
      <td className="py-3 px-3">
        <CategoryBadge category={event.category} />
      </td>
      <td className="py-3 px-3 text-sm text-white truncate max-w-[160px]">
        {event.actor}
      </td>
      <td className="py-3 px-3 text-sm text-gray-300">
        {event.action}
      </td>
      <td className="py-3 px-3 text-sm text-gray-400 truncate max-w-[160px]">
        {event.target || '--'}
      </td>
      <td className="py-3 px-3">
        {event.details ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            {expanded ? 'Hide' : 'View'}
          </button>
        ) : (
          <span className="text-xs text-gray-500">--</span>
        )}
      </td>
    </tr>
  );
});

const AuditTrailContent = memo(function AuditTrailContent() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<SubTab>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useAuditTrail(page, filter, search);

  const handleFilterChange = useCallback((newFilter: SubTab) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading audit trail...</span>
      </div>
    );
  }

  const events = data?.events || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search events, actors, targets..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as SubTab)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="all">All Categories</option>
            <option value="admin">Admin Actions</option>
            <option value="subscription">Subscriptions</option>
            <option value="signup">Signups</option>
          </select>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Events Table */}
      {events.length > 0 ? (
        <div className="border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 bg-gray-800/50">
                  <th className="py-3 px-3 font-medium">Time</th>
                  <th className="py-3 px-3 font-medium">Category</th>
                  <th className="py-3 px-3 font-medium">Actor</th>
                  <th className="py-3 px-3 font-medium">Action</th>
                  <th className="py-3 px-3 font-medium">Target</th>
                  <th className="py-3 px-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center">
          <ScrollText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 text-sm">No audit events found</p>
          {(search || filter !== 'all') && (
            <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filter</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            {total} event{total !== 1 ? 's' : ''} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

/** Displays a searchable, filterable audit trail of all admin, subscription, and signup events. */
export const AuditTrailPanel = memo(function AuditTrailPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('all');

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
                  ? 'border-amber-500 text-amber-400'
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
        <AuditTrailContent key={activeSubTab} />
      </div>
    </div>
  );
});
