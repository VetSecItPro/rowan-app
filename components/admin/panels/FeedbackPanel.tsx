'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Bug,
  Lightbulb,
  MessageCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  Clock,
  Inbox,
} from 'lucide-react';
import type { FeedbackCategory, FeedbackStatus, UserFeedback } from '@/lib/types';

// =============================================
// Constants
// =============================================

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; icon: typeof Bug; badgeClass: string }> = {
  bug_report: { label: 'Bug Report', icon: Bug, badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30' },
  feature_request: { label: 'Feature Request', icon: Lightbulb, badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  general: { label: 'General', icon: MessageCircle, badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; badgeClass: string }> = {
  open: { label: 'Open', badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Progress', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  done: { label: 'Done', badgeClass: 'bg-green-500/10 text-green-400 border-green-500/30' },
  deleted: { label: 'Deleted', badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
};

const CATEGORY_TABS: { id: FeedbackCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bug_report', label: 'Bug Reports' },
  { id: 'feature_request', label: 'Feature Requests' },
  { id: 'general', label: 'General' },
];

interface FeedbackStats {
  total: number;
  open: number;
  in_progress: number;
  done: number;
  bug_reports: number;
  feature_requests: number;
  general: number;
}

interface FeedbackApiResponse {
  success: boolean;
  feedback: { items: UserFeedback[]; total: number };
  stats: FeedbackStats | null;
}

// =============================================
// Component
// =============================================

export function FeedbackPanel() {
  const queryClient = useQueryClient();

  // Filter state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Simple debounce via setTimeout
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  };

  const limit = 15;

  // Fetch feedback
  const { data, isLoading } = useQuery<FeedbackApiResponse>({
    queryKey: ['admin-feedback', page, limit, statusFilter, categoryFilter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        category: categoryFilter,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await adminFetch(`/api/admin/feedback?${params}`);
      if (!res.ok) throw new Error('Failed to fetch feedback');
      return res.json();
    },
  });

  // Update feedback mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: { feedbackId: string; status?: FeedbackStatus; admin_notes?: string }) => {
      const res = await adminFetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
    },
  });

  const stats = data?.stats;
  const items = data?.feedback?.items ?? [];
  const total = data?.feedback?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleStatusChange = (feedbackId: string, newStatus: FeedbackStatus) => {
    updateMutation.mutate({ feedbackId, status: newStatus });
  };

  const handleSaveNotes = (feedbackId: string) => {
    updateMutation.mutate({ feedbackId, admin_notes: editingNotes });
  };

  const toggleExpand = (item: UserFeedback) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      setEditingNotes(item.admin_notes ?? '');
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color="text-white" />
          <StatCard label="Open" value={stats.open} color="text-yellow-400" />
          <StatCard label="In Progress" value={stats.in_progress} color="text-blue-400" />
          <StatCard label="Done" value={stats.done} color="text-green-400" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Category sub-tabs */}
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setCategoryFilter(tab.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as FeedbackStatus | 'all'); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gray-600"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="deleted">Deleted</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search feedback..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-gray-800/30 border border-gray-800">
          <Inbox className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No feedback found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const catCfg = CATEGORY_CONFIG[item.category];
            const CatIcon = catCfg.icon;
            const statusCfg = STATUS_CONFIG[item.status];
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => toggleExpand(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/80 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  )}

                  {/* Category badge */}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border shrink-0 ${catCfg.badgeClass}`}>
                    <CatIcon className="w-3 h-3" />
                    {catCfg.label}
                  </span>

                  {/* Title */}
                  <span className="text-sm text-white truncate flex-1">{item.title}</span>

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusCfg.badgeClass}`}>
                    {statusCfg.label}
                  </span>

                  {/* Date */}
                  <span className="text-xs text-gray-500 shrink-0 hidden sm:block">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-700/50 px-4 py-4 space-y-4">
                    {/* Full description */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {/* Status update */}
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium text-gray-400">Status:</p>
                      <select
                        value={item.status}
                        onChange={e => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                        disabled={updateMutation.isPending}
                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-gray-600"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="deleted">Delete</option>
                      </select>
                      {updateMutation.isPending && <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />}
                    </div>

                    {/* Admin notes */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Admin Notes</p>
                      <textarea
                        value={editingNotes}
                        onChange={e => setEditingNotes(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Internal notes..."
                        className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 resize-none"
                      />
                      <button
                        onClick={() => handleSaveNotes(item.id)}
                        disabled={updateMutation.isPending}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-500 disabled:opacity-40 transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save Notes
                      </button>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created: {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span>User: {item.user_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">{total} total items</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded bg-gray-800 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// Sub-components
// =============================================

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
