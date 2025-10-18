'use client';

import { useState, useEffect } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { UserBadge } from '@/lib/services/achievement-service';
import { getUserBadges, getUserBadgeStats } from '@/lib/services/achievement-service';

interface BadgesWidgetProps {
  userId: string;
  spaceId: string;
}

export default function BadgesWidget({ userId, spaceId }: BadgesWidgetProps) {
  const [recentBadges, setRecentBadges] = useState<UserBadge[]>([]);
  const [stats, setStats] = useState({ totalBadges: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, [userId, spaceId]);

  async function loadBadges() {
    try {
      const [badges, badgeStats] = await Promise.all([
        getUserBadges(userId, spaceId),
        getUserBadgeStats(userId, spaceId),
      ]);

      // Get most recent 3 badges
      setRecentBadges(badges.slice(0, 3));
      setStats(badgeStats);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 h-full animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-gray-700 dark:text-gray-300 font-medium text-xs sm:text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-600" />
          Achievements
        </h3>
        <Link
          href="/goals/badges"
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {stats.totalBadges === 0 ? (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">🏆</div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Complete goals to earn badges!
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalBadges}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Badges Earned
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.totalPoints}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Points</div>
            </div>
          </div>

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Recent Badges
              </div>
              <div className="flex gap-2">
                {recentBadges.map((userBadge) => (
                  <div
                    key={userBadge.id}
                    className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-2 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-shadow"
                    title={userBadge.badge?.name}
                  >
                    <div className="text-2xl text-center">{userBadge.badge?.icon}</div>
                    <div className="text-xs text-center text-gray-600 dark:text-gray-400 truncate mt-1">
                      {userBadge.badge?.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View all link */}
          <Link
            href="/goals/badges"
            className="mt-3 block text-center text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
          >
            View All Badges →
          </Link>
        </>
      )}
    </div>
  );
}
