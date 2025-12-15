'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';
import {
  TestTube,
  MessageSquare,
  Plus,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Calendar,
  User,
  Tag,
  AlertTriangle,
  Clock,
  Filter
} from 'lucide-react';
import { FeedbackForm } from '@/components/beta/FeedbackForm';

interface Feedback {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature_request' | 'ui_ux' | 'performance' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  page_url?: string;
  upvotes: number;
  downvotes: number;
  user_vote?: 'up' | 'down' | null;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  _count: {
    comments: number;
  };
}

const CATEGORIES = {
  bug: { label: 'Bug Report', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  feature_request: { label: 'Feature Request', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  ui_ux: { label: 'UI/UX Feedback', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  performance: { label: 'Performance', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
};

const SEVERITY_COLORS = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-green-600 dark:text-green-400'
};

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  resolved: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

export default function BetaFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bugs' | 'features' | 'my_feedback'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_voted'>('newest');

  // Check if user is a beta tester
  useEffect(() => {
    if (!user?.is_beta_tester || user.beta_status !== 'approved') {
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  // Load feedback
  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/beta/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      logger.error('Error loading feedback:', error, { component: 'page', action: 'execution' });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (feedbackId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch('/api/beta/feedback/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId, voteType }),
      });

      if (response.ok) {
        // Refresh feedback to show updated vote counts
        await loadFeedback();
      }
    } catch (error) {
      logger.error('Error voting:', error, { component: 'page', action: 'execution' });
    }
  };

  const filteredFeedback = feedback.filter(item => {
    switch (filter) {
      case 'bugs':
        return item.category === 'bug';
      case 'features':
        return item.category === 'feature_request';
      case 'my_feedback':
        return item.user.email === user?.email;
      default:
        return true;
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most_voted':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (!user?.is_beta_tester) {
    return null; // Will redirect
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Beta Feedback Center
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Share your feedback and help improve Rowan App
                </p>
              </div>
            </div>

            {/* Actions and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex flex-wrap gap-3">
                {/* Filter buttons */}
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Feedback
                </button>
                <button
                  onClick={() => setFilter('bugs')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'bugs'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Bugs
                </button>
                <button
                  onClick={() => setFilter('features')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'features'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Features
                </button>
                <button
                  onClick={() => setFilter('my_feedback')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'my_feedback'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  My Feedback
                </button>
              </div>

              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="most_voted">Most Voted</option>
                </select>

                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>

          {/* Feedback List */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No feedback yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Be the first to submit feedback and help improve the app!
                </p>
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Submit Feedback
                </button>
              </div>
            ) : (
              filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORIES[item.category].color}`}>
                          {CATEGORIES[item.category].label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{item.user.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className={`w-3 h-3 ${SEVERITY_COLORS[item.severity]}`} />
                          <span className={`capitalize ${SEVERITY_COLORS[item.severity]}`}>
                            {item.severity}
                          </span>
                        </div>
                        {item.page_url && (
                          <a
                            href={item.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Page
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Voting */}
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleVote(item.id, 'up')}
                        className={`p-2 rounded-lg transition-colors ${
                          item.user_vote === 'up'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">
                        {item.upvotes - item.downvotes}
                      </span>
                      <button
                        onClick={() => handleVote(item.id, 'down')}
                        className={`p-2 rounded-lg transition-colors ${
                          item.user_vote === 'down'
                            ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Priority: {item.priority.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>{item._count.comments} comments</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submit Feedback Modal - We'll create this as a separate component */}
      {showSubmitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            {/* Modal content will go here - we'll create this as a separate component */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Submit Feedback
                </h2>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FeedbackForm
                onSubmit={() => {
                  setShowSubmitForm(false);
                  loadFeedback(); // Refresh the feedback list
                }}
                onCancel={() => setShowSubmitForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}