'use client';

// Phase 14: Points Display Component
// Shows user's points, level, streak, and progress

import { useEffect, useState } from 'react';
import { pointsService } from '@/lib/services/rewards';
import { LEVEL_DEFINITIONS } from '@/lib/types/rewards';
import type { UserRewardsStats, LevelDefinition } from '@/lib/types/rewards';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

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
        logger.error('Failed to load points stats:', err, { component: 'PointsDisplay', action: 'component_action' });
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
        <div className="h-12 bg-gray-700 rounded-lg" />
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
        <Tooltip content="Earn points by completing tasks and chores. Spend them in the Rewards Shop!" position="bottom">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 rounded-full cursor-help">
            <span className="text-lg">{currentLevel.badge_emoji}</span>
            <span className="font-semibold text-amber-300">
              {stats.total_points.toLocaleString()}
            </span>
            <span className="text-amber-400 text-sm">pts</span>
          </div>
        </Tooltip>

        {/* Streak Badge */}
        {showStreak && stats.current_streak > 0 && (
          <Tooltip content={`${stats.current_streak} day streak! Complete chores daily for bonus points.`} position="bottom">
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-900/30 rounded-full cursor-help">
              <span className="text-sm">🔥</span>
              <span className="font-medium text-orange-300 text-sm">
                {stats.current_streak}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 ${className}`}>
      {/* Header with Level */}
      <div className="flex items-center justify-between mb-4">
        <Tooltip content={`Level up by earning more points! Each level unlocks new badges.`} position="right">
          <div className="flex items-center gap-2 cursor-help">
            <span className="text-2xl">{currentLevel.badge_emoji}</span>
            <div>
              <h3 className="font-semibold text-white">
                {currentLevel.name}
              </h3>
              <p className="text-sm text-gray-400">
                Level {stats.level}
              </p>
            </div>
          </div>
        </Tooltip>
        <Tooltip content="Complete tasks and chores to earn points!" position="left">
          <div className="text-right cursor-help">
            <p className="text-2xl font-bold text-amber-400">
              {stats.total_points.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">points</p>
          </div>
        </Tooltip>
      </div>

      {/* Progress Bar */}
      {nextLevel && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress to {nextLevel.name}</span>
            <span>{stats.progress_to_next_level}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
              style={{ width: `${stats.progress_to_next_level}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.next_level_points - stats.total_points} points to next level
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        {showStreak && (
          <Tooltip content="Complete at least 1 chore each day to build your streak. Streaks earn bonus points!" position="top">
            <div className="bg-orange-900/20 rounded-lg p-3 cursor-help">
              <div className="flex items-center gap-2">
                <span>🔥</span>
                <span className="text-lg font-semibold text-orange-400">
                  {stats.current_streak}
                </span>
              </div>
              <p className="text-xs text-orange-400/70 mt-0.5">
                day streak
              </p>
            </div>
          </Tooltip>
        )}

        {/* This Week */}
        <Tooltip content="Points earned since Sunday. Keep completing tasks to grow this number!" position="top">
          <div className="bg-blue-900/20 rounded-lg p-3 cursor-help">
            <div className="flex items-center gap-2">
              <span>📈</span>
              <span className="text-lg font-semibold text-blue-400">
                {stats.points_this_week}
              </span>
            </div>
            <p className="text-xs text-blue-400/70 mt-0.5">
              pts this week
            </p>
          </div>
        </Tooltip>

        {/* Chores Today */}
        <Tooltip content="Number of chores you've completed today. Each chore earns points!" position="top">
          <div className="bg-green-900/20 rounded-lg p-3 cursor-help">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span className="text-lg font-semibold text-green-400">
                {stats.chores_completed_today}
              </span>
            </div>
            <p className="text-xs text-green-400/70 mt-0.5">
              chores today
            </p>
          </div>
        </Tooltip>

        {/* Longest Streak */}
        <Tooltip content="Your personal best! Try to beat your longest streak record." position="top">
          <div className="bg-purple-900/20 rounded-lg p-3 cursor-help">
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <span className="text-lg font-semibold text-purple-400">
                {stats.longest_streak}
              </span>
            </div>
            <p className="text-xs text-purple-400/70 mt-0.5">
              best streak
            </p>
          </div>
        </Tooltip>
      </div>

      {/* Pending Redemptions */}
      {stats.pending_redemptions > 0 && (
        <div className="mt-3 px-3 py-2 bg-amber-900/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-amber-300">
            {stats.pending_redemptions} reward{stats.pending_redemptions > 1 ? 's' : ''} pending
          </span>
          <span className="text-amber-400">→</span>
        </div>
      )}
    </div>
  );
}
