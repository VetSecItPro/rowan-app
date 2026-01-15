'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, BarChart3, TrendingUp, Eye, MousePointer, CheckCircle } from 'lucide-react';
import { smartNudgesService } from '@/lib/services/smart-nudges-service';
import { useAuth } from '@/lib/contexts/auth-context';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface NudgeAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  total_nudges: number;
  read_nudges: number;
  clicked_nudges: number;
  effective_nudges: number;
  dismissed_nudges: number;
  read_rate: number;
  click_rate: number;
  effectiveness_rate: number;
  category_breakdown: Record<string, number>;
}

export function NudgeAnalytics({ isOpen, onClose }: NudgeAnalyticsProps) {
  const { user, currentSpace } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    if (isOpen && user && currentSpace) {
      loadAnalytics();
    }
  }, [isOpen, user, currentSpace, timeRange]);

  const loadAnalytics = async () => {
    if (!user || !currentSpace) return;

    try {
      setLoading(true);
      const data = await smartNudgesService.getNudgeAnalytics(
        user.id,
        currentSpace.id,
        timeRange
      );
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to load analytics:', error, { component: 'NudgeAnalytics', action: 'component_action' });
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      reminder: '🔔',
      motivation: '⭐',
      milestone: '🏆',
      deadline: '⏰',
      celebration: '🎉',
      summary: '📊'
    };
    return icons[category as keyof typeof icons] || '📌';
  };

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-bold leading-6 text-white"
                      >
                        Nudge Analytics
                      </Dialog.Title>
                      <p className="text-sm text-gray-400">
                        Your goal nudge performance insights
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Time Range Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">
                    Time Range
                  </label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 3 months</option>
                    <option value={365}>Last year</option>
                  </select>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-medium text-blue-400">
                            Total Nudges
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-blue-300">
                          {analytics.total_nudges}
                        </div>
                      </div>

                      <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Eye className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-medium text-green-400">
                            Read Rate
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${getPercentageColor(analytics.read_rate)}`}>
                          {formatPercentage(analytics.read_rate)}
                        </div>
                      </div>

                      <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <MousePointer className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">
                            Click Rate
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${getPercentageColor(analytics.click_rate)}`}>
                          {formatPercentage(analytics.click_rate)}
                        </div>
                      </div>

                      <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-orange-400" />
                          <span className="text-xs font-medium text-orange-400">
                            Effectiveness
                          </span>
                        </div>
                        <div className={`text-2xl font-bold ${getPercentageColor(analytics.effectiveness_rate)}`}>
                          {formatPercentage(analytics.effectiveness_rate)}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-white mb-4">
                        Detailed Breakdown
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Nudges Sent</span>
                          <span className="font-medium text-white">
                            {analytics.total_nudges}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Nudges Read</span>
                          <span className="font-medium text-white">
                            {analytics.read_nudges} ({formatPercentage(analytics.read_rate)})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Nudges Clicked</span>
                          <span className="font-medium text-white">
                            {analytics.clicked_nudges} ({formatPercentage(analytics.click_rate)})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Effective Actions</span>
                          <span className="font-medium text-white">
                            {analytics.effective_nudges} ({formatPercentage(analytics.effectiveness_rate)})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Dismissed</span>
                          <span className="font-medium text-white">
                            {analytics.dismissed_nudges}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(analytics.category_breakdown).length > 0 && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-white mb-4">
                          Nudges by Category
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(analytics.category_breakdown)
                            .sort(([,a], [,b]) => b - a)
                            .map(([category, count]) => {
                              const percentage = analytics.total_nudges > 0
                                ? (count / analytics.total_nudges) * 100
                                : 0;

                              return (
                                <div key={category} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg">{getCategoryIcon(category)}</span>
                                    <span className="text-sm font-medium text-white capitalize">
                                      {category}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-white w-8">
                                      {count}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                      <h4 className="font-medium text-blue-100 mb-2 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Insights</span>
                      </h4>
                      <div className="space-y-2 text-sm text-blue-200">
                        {analytics.total_nudges === 0 ? (
                          <p>No nudges sent yet. Enable nudges to start tracking your progress!</p>
                        ) : (
                          <>
                            {analytics.effectiveness_rate > 80 && (
                              <p>🎉 Excellent! Your nudges are highly effective. You're taking action on most suggestions.</p>
                            )}
                            {analytics.effectiveness_rate < 30 && analytics.total_nudges > 5 && (
                              <p>💡 Consider adjusting your nudge settings to better match your preferences and schedule.</p>
                            )}
                            {analytics.read_rate > 90 && (
                              <p>👀 Great engagement! You're reading almost all your nudges.</p>
                            )}
                            {analytics.click_rate < analytics.read_rate / 2 && analytics.read_nudges > 5 && (
                              <p>🎯 You're reading nudges but not clicking them often. Consider if the action buttons are helpful.</p>
                            )}
                            {Object.keys(analytics.category_breakdown).length > 0 && (
                              <p>
                                📈 Your most frequent nudge type is{' '}
                                <strong>
                                  {Object.entries(analytics.category_breakdown)
                                    .sort(([,a], [,b]) => b - a)[0][0]}
                                </strong>
                                .
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No analytics data available for this period.
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}