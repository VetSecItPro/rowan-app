'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Sparkles, AlertCircle, Heart, Zap } from 'lucide-react';
import type { DailyCheckIn } from '@/lib/services/checkins-service';
import { moodInsightsService, type MoodInsight } from '@/lib/analytics/mood-insights';

interface WeeklyInsightsProps {
  checkIns: DailyCheckIn[];
}

export function WeeklyInsights({ checkIns }: WeeklyInsightsProps) {
  const summary = useMemo(() => {
    return moodInsightsService.getWeeklySummary(checkIns);
  }, [checkIns]);

  const patterns = useMemo(() => {
    return moodInsightsService.detectPatterns(checkIns);
  }, [checkIns]);

  const moodColors: Record<string, { bg: string; border: string; text: string }> = {
    great: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', text: 'text-green-700 dark:text-green-300' },
    good: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
    okay: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' },
    meh: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-300' },
    rough: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', text: 'text-red-700 dark:text-red-300' },
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return summary.averageScore >= 4 ? TrendingUp : TrendingDown;
      case 'pattern':
        return Sparkles;
      case 'streak':
        return Zap;
      case 'suggestion':
        return AlertCircle;
      default:
        return Heart;
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'negative':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  const totalCheckIns = Object.values(summary.moodDistribution).reduce((sum, count) => sum + count, 0);

  if (totalCheckIns === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-purple-200/20 dark:border-purple-500/20">
        <div className="text-center py-8">
          <Heart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">No check-ins this week yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start checking in to see weekly insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-blue-50/50 dark:from-purple-900/10 dark:via-pink-900/10 dark:to-blue-900/10 rounded-xl p-6 border border-purple-200/20 dark:border-purple-500/20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Weekly Insights
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {format(summary.weekStart, 'MMM d')} - {format(summary.weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        {/* Average Score Badge */}
        <div className="flex flex-col items-end">
          <div className={`px-3 py-1.5 rounded-full ${
            summary.averageScore >= 4
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : summary.averageScore >= 3
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
          }`}>
            <span className="text-lg font-bold">{summary.averageScore.toFixed(1)}</span>
            <span className="text-xs ml-1">/ 5.0</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average</p>
        </div>
      </div>

      {/* Mood Distribution */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mood Distribution</h4>

        {/* Bar Chart */}
        <div className="space-y-2">
          {Object.entries(summary.moodDistribution).map(([mood, count]) => {
            const percentage = totalCheckIns > 0 ? (count / totalCheckIns) * 100 : 0;
            const colors = moodColors[mood as keyof typeof moodColors];

            return (
              <div key={mood} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-14 capitalize">
                  {mood}
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bg} ${colors.border} border-l-4 transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${percentage}%` }}
                  >
                    {count > 0 && (
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Dominant Mood */}
        {summary.dominantMood && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Most common mood: <span className="font-semibold capitalize text-gray-900 dark:text-white">{summary.dominantMood}</span>
            </p>
          </div>
        )}
      </div>

      {/* Insights */}
      {summary.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">AI Insights</h4>
          <div className="space-y-2">
            {summary.insights.map((insight: MoodInsight, index: number) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getInsightColor(insight.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="text-xs mt-1 opacity-90">{insight.description}</p>
                    </div>
                    <div className="text-xs opacity-70">
                      {insight.confidence}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Detected Patterns</h4>
          <div className="space-y-2">
            {patterns.map((pattern, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-purple-900 dark:text-purple-100">{pattern.description}</p>
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">
                    {pattern.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {totalCheckIns} check-in{totalCheckIns !== 1 ? 's' : ''} this week • Keep it up!
        </p>
      </div>
    </div>
  );
}
