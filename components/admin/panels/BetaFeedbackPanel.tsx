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
  Trash2,
  Search,
  Download,
  Globe,
  X,
} from 'lucide-react';
import { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types';
import Image from 'next/image';

const getTypeIcon = (type: FeedbackType | null, size: string = 'w-3 h-3') => {
  switch (type) {
    case FeedbackType.BUG:
      return <Bug className={`${size} text-red-500`} />;
    case FeedbackType.FEATURE_REQUEST:
      return <Lightbulb className={`${size} text-blue-500`} />;
    case FeedbackType.UI_UX:
      return <Palette className={`${size} text-purple-500`} />;
    default:
      return <MessageCircle className={`${size} text-gray-500`} />;
  }
};

const getStatusBadge = (status: FeedbackStatus) => {
  const config: Record<FeedbackStatus, { bg: string; text: string; icon: typeof Clock }> = {
    [FeedbackStatus.NEW]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Clock },
    [FeedbackStatus.IN_PROGRESS]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: AlertCircle },
    [FeedbackStatus.RESOLVED]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    [FeedbackStatus.WONT_FIX]: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-400', icon: XCircle },
  };

  const { bg, text, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ')}
    </span>
  );
};

export const BetaFeedbackPanel = memo(function BetaFeedbackPanel() {
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'bugs' | 'features'>('all');
  const [hideResolved, setHideResolved] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSubmission | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // React Query for feedback with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-beta-feedback', timeRange],
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
        if (selectedFeedback?.id === id) {
          setSelectedFeedback(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      logger.error('Failed to update status:', error, { component: 'BetaFeedbackPanel', action: 'component_action' });
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchData();
        if (selectedFeedback?.id === id) {
          setSelectedFeedback(null);
        }
      }
    } catch (error) {
      logger.error('Failed to delete feedback:', error, { component: 'BetaFeedbackPanel', action: 'component_action' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Type', 'Feature', 'Description', 'Status'];
    const rows = feedback.map(f => [
      new Date(f.created_at).toLocaleDateString(),
      f.user?.name || 'Unknown',
      f.user?.email || 'Unknown',
      f.feedback_type || 'N/A',
      f.feature_name || 'N/A',
      f.description,
      f.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Apply all filters
  let filteredFeedback = feedback;

  // Hide resolved if toggle is on
  if (hideResolved) {
    filteredFeedback = filteredFeedback.filter(f =>
      f.status !== FeedbackStatus.RESOLVED && f.status !== FeedbackStatus.WONT_FIX
    );
  }

  // Apply category filter
  if (filter === 'new') {
    filteredFeedback = filteredFeedback.filter(f => f.status === FeedbackStatus.NEW);
  } else if (filter === 'in_progress') {
    filteredFeedback = filteredFeedback.filter(f => f.status === FeedbackStatus.IN_PROGRESS);
  } else if (filter === 'bugs') {
    filteredFeedback = filteredFeedback.filter(f => f.feedback_type === FeedbackType.BUG);
  } else if (filter === 'features') {
    filteredFeedback = filteredFeedback.filter(f => f.feedback_type === FeedbackType.FEATURE_REQUEST);
  }

  // Apply search
  if (searchTerm) {
    filteredFeedback = filteredFeedback.filter(f =>
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.feature_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const stats = {
    total: feedback.length,
    active: feedback.filter(f => f.status !== FeedbackStatus.RESOLVED && f.status !== FeedbackStatus.WONT_FIX).length,
    new: feedback.filter(f => f.status === FeedbackStatus.NEW).length,
    inProgress: feedback.filter(f => f.status === FeedbackStatus.IN_PROGRESS).length,
    resolved: feedback.filter(f => f.status === FeedbackStatus.RESOLVED).length,
    bugs: feedback.filter(f => f.feedback_type === FeedbackType.BUG).length,
    features: feedback.filter(f => f.feedback_type === FeedbackType.FEATURE_REQUEST).length,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading beta feedback...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Stats Row */}
      <div className="grid grid-cols-7 gap-2 flex-shrink-0">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center border border-indigo-200 dark:border-indigo-800">
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stats.active}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">Active</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.new}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.resolved}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.bugs}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Bugs</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.features}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Features</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        {/* Hide Resolved Toggle */}
        <label className="flex items-center gap-1.5 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={hideResolved}
            onChange={(e) => setHideResolved(e.target.checked)}
            className="w-3 h-3 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-indigo-700 dark:text-indigo-300">Hide Done</span>
        </label>

        {/* Category Filters */}
        <div className="flex items-center gap-1">
          {(['all', 'new', 'in_progress', 'bugs', 'features'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f === 'new' ? 'New' : f === 'in_progress' ? 'In Progress' : f === 'bugs' ? 'Bugs' : 'Features'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-violet-500 text-gray-900 dark:text-white"
          />
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range === '7d' ? '7d' : range === '30d' ? '30d' : '90d'}
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={exportToCSV}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Export CSV"
        >
          <Download className="w-3 h-3" />
        </button>
        <button
          onClick={fetchData}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Feedback Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Table Header - Fixed */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="grid grid-cols-[80px_150px_120px_1fr_120px_80px] gap-2 px-3 py-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">Actions</div>
          </div>
        </div>

        {/* Table Body - Scrollable and fills remaining space */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredFeedback.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="grid grid-cols-[80px_150px_120px_1fr_120px_80px] gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(item.created_at)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {item.user?.name || item.user?.email?.split('@')[0] || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getTypeIcon(item.feedback_type)}
                    <span className="text-xs text-gray-700 dark:text-gray-300 capitalize truncate">
                      {item.feedback_type?.replace('_', ' ') || 'General'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-900 dark:text-white truncate">
                      {item.description}
                    </p>
                    {item.feature_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.feature_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as FeedbackStatus)}
                      className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-violet-500 w-full"
                    >
                      <option value={FeedbackStatus.NEW}>New</option>
                      <option value={FeedbackStatus.IN_PROGRESS}>In Progress</option>
                      <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                      <option value={FeedbackStatus.WONT_FIX}>Won't Fix</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedFeedback(item)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFeedback(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 py-12">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No feedback found</p>
              <p className="text-xs mt-1">Feedback from beta users will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-violet-600 rounded-t-xl">
              <h2 className="text-lg font-bold text-white">Feedback Details</h2>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3">
                {selectedFeedback.user?.avatar_url ? (
                  <Image
                    src={selectedFeedback.user.avatar_url}
                    alt={selectedFeedback.user.name || 'User'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold">
                    {selectedFeedback.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFeedback.user?.name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedFeedback.user?.email || 'No email'}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedFeedback.feedback_type, 'w-4 h-4')}
                    <span className="text-sm text-gray-900 dark:text-white capitalize">
                      {selectedFeedback.feedback_type?.replace('_', ' ') || 'Not specified'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h3>
                  {getStatusBadge(selectedFeedback.status)}
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Feature</h3>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {selectedFeedback.feature_name || 'Not specified'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Submitted</h3>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Page URL */}
              {selectedFeedback.page_url && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Page URL</h3>
                  <a
                    href={selectedFeedback.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    {selectedFeedback.page_url}
                  </a>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</h3>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshot_url && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Screenshot</h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    <Image
                      src={selectedFeedback.screenshot_url}
                      alt="Feedback screenshot"
                      width={600}
                      height={400}
                      className="w-full h-auto rounded"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => {
                    deleteFeedback(selectedFeedback.id);
                  }}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFeedback.status}
                    onChange={(e) => {
                      updateStatus(selectedFeedback.id, e.target.value as FeedbackStatus);
                    }}
                    className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500"
                  >
                    <option value={FeedbackStatus.NEW}>New</option>
                    <option value={FeedbackStatus.IN_PROGRESS}>In Progress</option>
                    <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                    <option value={FeedbackStatus.WONT_FIX}>Won't Fix</option>
                  </select>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
