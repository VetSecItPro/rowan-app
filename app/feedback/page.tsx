'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  MessageSquare,
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
  Globe,
} from 'lucide-react';
import { FeedbackSubmission, FeedbackType, FeedbackStatus } from '@/lib/types';
import Image from 'next/image';
import { toast } from 'sonner';

export default function MyFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.data || []);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load your feedback');
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Feedback deleted successfully');
        await loadFeedback();
        if (selectedFeedback?.id === id) {
          setShowDetailModal(false);
          setSelectedFeedback(null);
        }
      } else {
        toast.error('Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    }
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

  const getStatusLabel = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.NEW:
        return 'New';
      case FeedbackStatus.IN_PROGRESS:
        return 'In Progress';
      case FeedbackStatus.RESOLVED:
        return 'Resolved';
      case FeedbackStatus.WONT_FIX:
        return "Won't Fix";
    }
  };

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.NEW:
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case FeedbackStatus.IN_PROGRESS:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case FeedbackStatus.RESOLVED:
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case FeedbackStatus.WONT_FIX:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  My Feedback
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  View and manage your feedback submissions
                </p>
              </div>
            </div>
          </div>

          {/* Feedback List */}
          {feedback.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No feedback submitted yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Click the feedback button in the header to submit your first feedback
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.feedback_type)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {item.feedback_type?.replace('_', ' ') || 'General'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
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
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {getStatusLabel(item.status)}
                    </div>
                  </div>

                  {/* Feature */}
                  {item.feature_name && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Feature: </span>
                      <span className="text-sm text-gray-900 dark:text-white">{item.feature_name}</span>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
                    {item.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    {item.screenshot_url && (
                      <div className="flex items-center gap-1 text-blue-500">
                        <Image src="/placeholder.svg" alt="" width={12} height={12} className="w-3 h-3" />
                        Screenshot
                      </div>
                    )}
                  </div>

                  {/* Admin Notes Preview */}
                  {item.admin_notes && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Admin Response:</div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 line-clamp-2">{item.admin_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedFeedback.feedback_type)}
                    <span className="text-gray-900 dark:text-white capitalize">
                      {selectedFeedback.feedback_type?.replace('_', ' ') || 'General'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedFeedback.status)}`}>
                    {getStatusIcon(selectedFeedback.status)}
                    {getStatusLabel(selectedFeedback.status)}
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

              {/* Admin Notes */}
              {selectedFeedback.admin_notes && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Admin Response</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedFeedback.admin_notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => deleteFeedback(selectedFeedback.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Feedback
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
