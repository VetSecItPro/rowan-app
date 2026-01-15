'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Palette,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  RefreshCw,
  Eye,
  User,
} from 'lucide-react';
import { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types';

const getTypeIcon = (type: FeedbackType | null) => {
  switch (type) {
    case FeedbackType.BUG:
      return <Bug className="w-3 h-3 text-red-500" />;
    case FeedbackType.FEATURE_REQUEST:
      return <Lightbulb className="w-3 h-3 text-blue-500" />;
    case FeedbackType.UI_UX:
      return <Palette className="w-3 h-3 text-purple-500" />;
    default:
      return <MessageCircle className="w-3 h-3 text-gray-500" />;
  }
};

const getStatusBadge = (status: FeedbackStatus) => {
  const config: Record<FeedbackStatus, { bg: string; text: string; icon: typeof Clock }> = {
    [FeedbackStatus.NEW]: { bg: 'bg-blue-900/30', text: 'text-blue-400', icon: Clock },
    [FeedbackStatus.IN_PROGRESS]: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', icon: AlertCircle },
    [FeedbackStatus.RESOLVED]: { bg: 'bg-green-900/30', text: 'text-green-400', icon: CheckCircle },
    [FeedbackStatus.WONT_FIX]: { bg: 'bg-gray-700', text: 'text-gray-400', icon: XCircle },
  };

  const { bg, text, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ')}
    </span>
  );
};

export const FeedbackPanel = memo(function FeedbackPanel() {
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // React Query for feedback with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-feedback', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/admin/feedback?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch feedback');
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const feedback: FeedbackSubmission[] = data || [];

  const fetchData = useCallback(() => {
    refetch();
  }, [refetch]);

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      logger.error('Failed to update status:', error, { component: 'FeedbackPanel', action: 'component_action' });
    }
  };

  const filteredFeedback = feedback.filter(item => {
    if (filter === 'all') return item.status !== FeedbackStatus.RESOLVED && item.status !== FeedbackStatus.WONT_FIX;
    if (filter === 'new') return item.status === FeedbackStatus.NEW;
    if (filter === 'in_progress') return item.status === FeedbackStatus.IN_PROGRESS;
    return true;
  });

  const stats = {
    total: feedback.length,
    active: feedback.filter(f => f.status !== FeedbackStatus.RESOLVED && f.status !== FeedbackStatus.WONT_FIX).length,
    new: feedback.filter(f => f.status === FeedbackStatus.NEW).length,
    bugs: feedback.filter(f => f.feedback_type === FeedbackType.BUG).length,
    features: feedback.filter(f => f.feedback_type === FeedbackType.FEATURE_REQUEST).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading feedback...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-indigo-900/20 rounded-lg p-3 text-center border border-indigo-800">
          <p className="text-lg font-bold text-indigo-400">{stats.active}</p>
          <p className="text-xs text-indigo-400">Active</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{stats.new}</p>
          <p className="text-xs text-gray-400">New</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-400">{stats.bugs}</p>
          <p className="text-xs text-gray-400">Bugs</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-purple-400">{stats.features}</p>
          <p className="text-xs text-gray-400">Features</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['all', 'new', 'in_progress'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-pink-100 bg-pink-900/30 text-pink-400'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Active' : f === 'new' ? 'New' : 'In Progress'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-0.5">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-gray-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7d' : range === '30d' ? '30d' : '90d'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="border border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-gray-700">
          {filteredFeedback.length > 0 ? (
            filteredFeedback.slice(0, 10).map((item) => (
              <div key={item.id} className="p-3 hover:bg-gray-800/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(item.feedback_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.description.slice(0, 80)}{item.description.length > 80 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          {item.user?.name || item.user?.email || 'Unknown'}
                        </div>
                        <span className="text-gray-600">|</span>
                        <span className="text-xs text-gray-400">
                          {item.feature_name || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(item.status)}
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as FeedbackStatus)}
                      className="text-xs px-2 py-1 border border-gray-600 rounded bg-gray-700 text-gray-300 focus:ring-1 focus:ring-pink-500"
                    >
                      <option value={FeedbackStatus.NEW}>New</option>
                      <option value={FeedbackStatus.IN_PROGRESS}>In Progress</option>
                      <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                      <option value={FeedbackStatus.WONT_FIX}>Won't Fix</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No feedback found</p>
            </div>
          )}
        </div>
        {filteredFeedback.length > 10 && (
          <div className="px-4 py-2 text-center text-xs text-gray-400 border-t border-gray-700 bg-gray-800">
            Showing 10 of {filteredFeedback.length} items
          </div>
        )}
      </div>
    </div>
  );
});
