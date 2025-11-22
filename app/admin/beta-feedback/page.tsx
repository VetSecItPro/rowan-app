'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  TestTube,
  Users,
  MessageSquare,
  TrendingUp,
  Calendar,
  Bug,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface FeedbackStats {
  total_feedback: number;
  open_feedback: number;
  critical_issues: number;
  bug_reports: number;
  feature_requests: number;
  total_votes: number;
  total_comments: number;
  most_upvoted: string;
}

interface BetaTesterStats {
  total_beta_testers: number;
  active_testers: number;
  pending_approval: number;
  signup_this_week: number;
}

interface Feedback {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature_request' | 'ui_ux' | 'performance' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  upvotes: number;
  downvotes: number;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  _count: {
    comments: number;
  };
}

export default function AdminBetaFeedbackPage() {
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [betaTesterStats, setBetaTesterStats] = useState<BetaTesterStats | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'critical' | 'bugs' | 'features'>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load stats and feedback in parallel
      const [statsResponse, feedbackResponse] = await Promise.all([
        fetch('/api/admin/beta/stats'),
        fetch('/api/admin/beta/feedback')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setFeedbackStats(statsData.feedback_stats);
        setBetaTesterStats(statsData.beta_tester_stats);
      }

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        setFeedback(feedbackData.feedback || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/beta/feedback/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId, status: newStatus })
      });

      if (response.ok) {
        // Refresh the data
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    switch (filter) {
      case 'open':
        return item.status === 'open';
      case 'critical':
        return item.severity === 'critical';
      case 'bugs':
        return item.category === 'bug';
      case 'features':
        return item.category === 'feature_request';
      default:
        return true;
    }
  });

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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <TestTube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Beta Testing Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage beta feedback and track testing progress
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Feedback Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Total Feedback</h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {feedbackStats?.total_feedback || 0}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {feedbackStats?.open_feedback || 0} open items
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Beta Testers</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {betaTesterStats?.total_beta_testers || 0}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {betaTesterStats?.active_testers || 0} active
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Critical Issues</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {feedbackStats?.critical_issues || 0}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Need immediate attention
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Total Votes</h3>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {feedbackStats?.total_votes || 0}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Community engagement
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Feedback Categories
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Bug Reports</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {feedbackStats?.bug_reports || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Feature Requests</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {feedbackStats?.feature_requests || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors">
                  <Download className="w-4 h-4" />
                  Export Feedback
                </button>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-sm bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Feedback
                </h3>
                <div className="flex items-center gap-3">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Feedback</option>
                    <option value="open">Open Only</option>
                    <option value="critical">Critical</option>
                    <option value="bugs">Bug Reports</option>
                    <option value="features">Features</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFeedback.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            By {item.user.name} • {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          item.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                          item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={item.status}
                          onChange={(e) => updateFeedbackStatus(item.id, e.target.value)}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.upvotes - item.downvotes}
                        <span className="ml-1">({item._count.comments} comments)</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-500 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredFeedback.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No feedback found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No feedback matches the selected filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}