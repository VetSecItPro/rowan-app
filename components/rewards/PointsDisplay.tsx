'use client';

// Phase 14: Points Display Component
// Shows user's points, level, streak, and progress

import { useEffect, useState } from 'react';
import { pointsService } from '@/lib/services/rewards';
import { LEVEL_DEFINITIONS } from '@/lib/types/rewards';
import type { UserRewardsStats, LevelDefinition } from '@/lib/types/rewards';

interface PointsDisplayProps {
  userId: string;
  spaceId: string;
  variant?: 'compact' | 'full';
  showStreak?: boolean;
  className?: string;
}

export function PointsDisplay({
  userId,
  spaceId,
  variant = 'compact',
  showStreak = true,
  className = '',
}: PointsDisplayProps) {
  const [stats, setStats] = useState<UserRewardsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const userStats = await pointsService.getUserStats(userId, spaceId);
        setStats(userStats);
        setError(null);
      } catch (err) {
        console.error('Failed to load points stats:', err);
        setError('Failed to load points');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [userId, spaceId]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const currentLevel = LEVEL_DEFINITIONS.find((l) => l.level === stats.level) || LEVEL_DEFINITIONS[0];
  const nextLevel = LEVEL_DEFINITIONS.find((l) => l.level === stats.level + 1);

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Points Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
          <span className="text-lg">{currentLevel.badge_emoji}</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {stats.total_points.toLocaleString()}
          </span>
          <span className="text-amber-600 dark:text-amber-400 text-sm">pts</span>
        </div>

        {/* Streak Badge */}
        {showStreak && stats.current_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
            <span className="text-sm">🔥</span>
            <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">
              {stats.current_streak}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
      {/* Header with Level */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentLevel.badge_emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {currentLevel.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Level {stats.level}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.total_points.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">points</p>
        </div>
      </div>

      {/* Progress Bar */}
      {nextLevel && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress to {nextLevel.name}</span>
            <span>{stats.progress_to_next_level}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress_to_next_level}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.next_level_points - stats.total_points} points to next level
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        {showStreak && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {stats.current_streak}
              </span>
            </div>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
              day streak
            </p>
          </div>
        )}

        {/* This Week */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span>📈</span>
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {stats.points_this_week}
            </span>
          </div>
          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
            pts this week
          </p>
        </div>

        {/* Chores Today */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {stats.chores_completed_today}
            </span>
          </div>
          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">
            chores today
          </p>
        </div>

        {/* Longest Streak */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span>🏆</span>
            <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {stats.longest_streak}
            </span>
          </div>
          <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-0.5">
            best streak
          </p>
        </div>
      </div>

      {/* Pending Redemptions */}
      {stats.pending_redemptions > 0 && (
        <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {stats.pending_redemptions} reward{stats.pending_redemptions > 1 ? 's' : ''} pending
          </span>
          <span className="text-amber-600 dark:text-amber-400">→</span>
        </div>
      )}
    </div>
  );
}
