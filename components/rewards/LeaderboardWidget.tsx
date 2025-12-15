'use client';

// Phase 14: Leaderboard Widget Component
// Shows family member rankings by points

import { useEffect, useState } from 'react';
import { pointsService } from '@/lib/services/rewards';
import { LEVEL_DEFINITIONS } from '@/lib/types/rewards';
import type { LeaderboardEntry } from '@/lib/types/rewards';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

interface LeaderboardWidgetProps {
  spaceId: string;
  currentUserId?: string;
  period?: 'week' | 'month' | 'all';
  maxEntries?: number;
  className?: string;
}

export function LeaderboardWidget({
  spaceId,
  currentUserId,
  period = 'week',
  maxEntries = 5,
  className = '',
}: LeaderboardWidgetProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(period);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true);
        const leaderboard = await pointsService.getLeaderboard(spaceId, activePeriod);
        setEntries(leaderboard.slice(0, maxEntries));
        setError(null);
      } catch (err) {
        logger.error('Failed to load leaderboard:', err, { component: 'LeaderboardWidget', action: 'component_action' });
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, [spaceId, activePeriod, maxEntries]);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return { emoji: '🥇', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
      case 2:
        return { emoji: '🥈', bg: 'bg-gray-100 dark:bg-gray-700/50' };
      case 3:
        return { emoji: '🥉', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      default:
        return { emoji: rank.toString(), bg: 'bg-gray-50 dark:bg-gray-800' };
    }
  };

  const getPointsForPeriod = (entry: LeaderboardEntry) => {
    switch (activePeriod) {
      case 'week':
        return entry.points_this_week;
      case 'month':
        return entry.points_this_month;
      default:
        return entry.points;
    }
  };

  const getPeriodLabel = () => {
    switch (activePeriod) {
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Tooltip content="See who's earning the most points! Complete tasks and chores to climb the rankings." position="right">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 cursor-help">
              🏆 Family Points Ranking
            </h3>
          </Tooltip>
          {/* Period Selector */}
          <div className="flex gap-1">
            <Tooltip content="Points earned since Sunday" position="bottom">
              <button
                onClick={() => setActivePeriod('week')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  activePeriod === 'week'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Week
              </button>
            </Tooltip>
            <Tooltip content="Points earned this calendar month" position="bottom">
              <button
                onClick={() => setActivePeriod('month')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  activePeriod === 'month'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Month
              </button>
            </Tooltip>
            <Tooltip content="Total points earned all time" position="bottom">
              <button
                onClick={() => setActivePeriod('all')}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  activePeriod === 'all'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
            No activity yet this {activePeriod === 'all' ? 'period' : activePeriod}
          </div>
        ) : (
          entries.map((entry) => {
            const rank = getRankDisplay(entry.rank);
            const levelDef = LEVEL_DEFINITIONS.find((l) => l.level === entry.level) || LEVEL_DEFINITIONS[0];
            const isCurrentUser = entry.user_id === currentUserId;
            const periodPoints = getPointsForPeriod(entry);

            return (
              <div
                key={entry.user_id}
                className={`px-4 py-3 flex items-center gap-3 ${
                  isCurrentUser ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                }`}
              >
                {/* Rank */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rank.bg}`}
                >
                  {entry.rank <= 3 ? rank.emoji : entry.rank}
                </div>

                {/* Avatar */}
                <div className="relative">
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Level Badge */}
                  <span className="absolute -bottom-1 -right-1 text-sm">
                    {levelDef.badge_emoji}
                  </span>
                </div>

                {/* Name & Stats */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${
                    isCurrentUser
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {entry.name}
                    {isCurrentUser && <span className="text-xs ml-1">(you)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Tooltip content={`Level ${entry.level} - Keep earning points to level up!`} position="bottom">
                      <span className="cursor-help">{levelDef.name}</span>
                    </Tooltip>
                    {entry.current_streak > 0 && (
                      <>
                        <span>•</span>
                        <Tooltip content={`${entry.current_streak} day streak - Completing chores daily!`} position="bottom">
                          <span className="text-orange-500 cursor-help">🔥 {entry.current_streak}</span>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    {periodPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
