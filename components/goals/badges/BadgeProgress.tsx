'use client';

import { useState, useEffect } from 'react';
import type { BadgeProgress as BadgeProgressType } from '@/lib/types';
import type { AchievementBadge } from '@/lib/services/achievement-service';
import { getBadgeProgress } from '@/lib/services/achievement-service';

interface BadgeProgressProps {
  userId: string;
  spaceId: string;
  limit?: number;
}

export default function BadgeProgress({
  userId,
  spaceId,
  limit = 5,
}: BadgeProgressProps) {
  const [badges, setBadges] = useState<
    Array<AchievementBadge & { progress: BadgeProgressType }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [userId, spaceId]);

  async function loadProgress() {
    setLoading(true);
    try {
      const progress = await getBadgeProgress(userId, spaceId);
      // Show only badges with some progress, sorted by percentage
      const withProgress = progress
        .filter((b) => b.progress.current > 0)
        .slice(0, limit);
      setBadges(withProgress);
    } catch (error) {
      console.error('Error loading badge progress:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Start completing goals to make progress toward badges!
        </p>
      </div>
    );
  }

  const rarityColors: Record<string, { bg: string; text: string; progress: string }> = {
    common: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      progress: 'bg-gray-400',
    },
    uncommon: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-300',
      progress: 'bg-gradient-to-r from-green-400 to-green-600',
    },
    rare: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-300',
      progress: 'bg-gradient-to-r from-blue-400 to-blue-600',
    },
    epic: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-700 dark:text-purple-300',
      progress: 'bg-gradient-to-r from-purple-400 to-purple-600',
    },
    legendary: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      progress: 'bg-gradient-to-r from-amber-400 to-amber-600',
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Next Achievements
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {badges.length} in progress
        </span>
      </div>

      <div className="space-y-3">
        {badges.map((badge) => {
          const colors = rarityColors[badge.rarity];

          return (
            <div
              key={badge.id}
              className={`
                ${colors.bg}
                rounded-lg p-4 border border-gray-200 dark:border-gray-700
                hover:shadow-lg transition-shadow duration-200
              `}
            >
              <div className="flex items-start gap-3">
                {/* Badge icon */}
                <div className="text-3xl grayscale">{badge.icon}</div>

                {/* Badge info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {badge.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                        {badge.description}
                      </p>
                    </div>

                    <span
                      className={`
                        flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                        ${colors.bg} ${colors.text}
                      `}
                    >
                      {badge.rarity}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {badge.progress.current} / {badge.progress.target}
                      </span>
                      <span className={`font-medium ${colors.text}`}>
                        {Math.round(badge.progress.percentage)}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${colors.progress} transition-all duration-500 rounded-full`}
                        style={{ width: `${badge.progress.percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Points reward */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                    <span>⭐</span>
                    <span className="font-medium">+{badge.points} points</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
