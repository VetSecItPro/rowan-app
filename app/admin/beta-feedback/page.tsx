'use client';

import { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { logger } from '@/lib/logger';
import {
  MessageSquare,
  Filter,
  Download,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Bug,
  Lightbulb,
  Palette,
  MessageCircle,
  Calendar,
  User,
  Globe,
  Image as ImageIcon,
  TestTube,
} from 'lucide-react';
import { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types';
import Image from 'next/image';

export default function AdminBetaFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: FeedbackStatus;
    feedback_type?: FeedbackType;
    search?: string;
  }>({});
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [hideResolved, setHideResolved] = useState(true); // Hide resolved by default

  useEffect(() => {
    loadFeedback();
  }, [filter]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.feedback_type) params.append('feedback_type', filter.feedback_type);
      if (filter.search) params.append('search', filter.search);

      const response = await fetch(`/api/admin/feedback?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.data || []);
      }
    } catch (error) {
      logger.error('Error loading feedback:', error, { component: 'page', action: 'execution' });
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, status: FeedbackStatus) => {
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await loadFeedback();
        if (selectedFeedback?.id === id) {
          const updatedItem = feedback.find(f => f.id === id);
          if (updatedItem) {
            setSelectedFeedback({ ...updatedItem, status });
          }
        }
      }
    } catch (error) {
      logger.error('Error updating feedback:', error, { component: 'page', action: 'execution' });
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadFeedback();
        if (selectedFeedback?.id === id) {
          setShowDetailModal(false);
          setSelectedFeedback(null);
        }
      }
    } catch (error) {
      logger.error('Error deleting feedback:', error, { component: 'page', action: 'execution' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Type', 'Feature', 'Description', 'Status', 'Page URL'];
    const rows = feedback.map(f => [
      new Date(f.created_at).toLocaleString(),
      f.user?.name || 'Unknown',
      f.user?.email || 'Unknown',
      f.feedback_type || 'N/A',
      f.feature_name || 'N/A',
      f.description,
      f.status,
      f.page_url || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTypeIcon = (type: FeedbackType | null) => {
    switch (type) {
      case FeedbackType.BUG:
        return <Bug className="w-4 h-4 text-red-500" />;
      case FeedbackType.FEATURE_REQUEST:
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case FeedbackType.UI_UX:
        return <Palette className="w-4 h-4 text-purple-500" />;
      case FeedbackType.GENERAL:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.NEW:
        return <Clock className="w-4 h-4 text-blue-500" />;
      case FeedbackStatus.IN_PROGRESS:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case FeedbackStatus.RESOLVED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case FeedbackStatus.WONT_FIX:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Filter feedback based on hideResolved toggle
  const displayedFeedback = hideResolved
    ? feedback.filter(f => f.status !== FeedbackStatus.RESOLVED && f.status !== FeedbackStatus.WONT_FIX)
    : feedback;

  const stats = {
    total: feedback.length,
    active: feedback.filter(f => f.status !== FeedbackStatus.RESOLVED && f.status !== FeedbackStatus.WONT_FIX).length,
    new: feedback.filter(f => f.status === FeedbackStatus.NEW).length,
    inProgress: feedback.filter(f => f.status === FeedbackStatus.IN_PROGRESS).length,
    resolved: feedback.filter(f => f.status === FeedbackStatus.RESOLVED).length,
    bugs: feedback.filter(f => f.feedback_type === FeedbackType.BUG).length,
    features: feedback.filter(f => f.feedback_type === FeedbackType.FEATURE_REQUEST).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs currentPage="Beta Feedback" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TestTube className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Beta Testing Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage beta feedback and bug reports
                </p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-indigo-500 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Active</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600">{stats.active}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">New</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Bug className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Bugs</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.bugs}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Lightbulb className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Features</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{stats.features}</div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
              </div>

              {/* Hide Resolved Toggle */}
              <label className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                <input
                  type="checkbox"
                  checked={hideResolved}
                  onChange={(e) => setHideResolved(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Hide Completed</span>
              </label>

              <select
                value={filter.status || ''}
                onChange={(e) => setFilter({ ...filter, status: e.target.value as FeedbackStatus || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value={FeedbackStatus.NEW}>New</option>
                <option value={FeedbackStatus.IN_PROGRESS}>In Progress</option>
                <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                <option value={FeedbackStatus.WONT_FIX}>Won't Fix</option>
              </select>
              <select
                value={filter.feedback_type || ''}
                onChange={(e) => setFilter({ ...filter, feedback_type: e.target.value as FeedbackType || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value={FeedbackType.BUG}>Bug Report</option>
                <option value={FeedbackType.FEATURE_REQUEST}>Feature Request</option>
                <option value={FeedbackType.UI_UX}>UI/UX</option>
                <option value={FeedbackType.GENERAL}>General</option>
              </select>
              <input
                type="text"
                placeholder="Search..."
                value={filter.search || ''}
                onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[200px]"
              />
          </div>
        </div>

        {/* Feedback Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {displayedFeedback.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.user?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(item.feedback_type)}
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {item.feedback_type?.replace('_', ' ') || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.feature_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-sm text-gray-900 dark:text-white">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => updateFeedbackStatus(item.id, e.target.value as FeedbackStatus)}
                          className="flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={FeedbackStatus.NEW}>New</option>
                          <option value={FeedbackStatus.IN_PROGRESS}>In Progress</option>
                          <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                          <option value={FeedbackStatus.WONT_FIX}>Won't Fix</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedFeedback(item);
                              setShowDetailModal(true);
                            }}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {feedback.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No feedback found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No feedback submissions match your filters.
                  </p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Feedback Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">User Information</h3>
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
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
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
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedFeedback.feedback_type)}
                    <span className="text-gray-900 dark:text-white capitalize">
                      {selectedFeedback.feedback_type?.replace('_', ' ') || 'Not specified'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h3>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedFeedback.status)}
                    <span className="text-gray-900 dark:text-white capitalize">
                      {selectedFeedback.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Feature/Page</h3>
                  <span className="text-gray-900 dark:text-white">
                    {selectedFeedback.feature_name || 'Not specified'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Submitted</h3>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Page URL */}
              {selectedFeedback.page_url && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Page URL</h3>
                  <a
                    href={selectedFeedback.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-2"
                  >
                    <Globe className="w-4 h-4" />
                    {selectedFeedback.page_url}
                  </a>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Description</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedFeedback.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedFeedback.screenshot_url && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Screenshot</h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    <Image
                      src={selectedFeedback.screenshot_url}
                      alt="Feedback screenshot"
                      width={800}
                      height={600}
                      className="w-full h-auto rounded"
                    />
                  </div>
                </div>
              )}

              {/* Browser Info */}
              {selectedFeedback.browser_info && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Browser Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm font-mono">
                    <pre className="whitespace-pre-wrap text-gray-900 dark:text-white">
                      {JSON.stringify(selectedFeedback.browser_info, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Admin Notes</h3>
                <textarea
                  value={selectedFeedback.admin_notes || ''}
                  onChange={(e) => setSelectedFeedback({ ...selectedFeedback, admin_notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add internal notes about this feedback..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => deleteFeedback(selectedFeedback.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Feedback
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      // Save admin notes
                      const response = await fetch(`/api/admin/feedback/${selectedFeedback.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ admin_notes: selectedFeedback.admin_notes }),
                      });
                      if (response.ok) {
                        await loadFeedback();
                        setShowDetailModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
