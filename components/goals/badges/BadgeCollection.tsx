'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BadgeProgress } from '@/lib/types';
import type { AchievementBadge, UserBadge } from '@/lib/services/achievement-service';
import BadgeCard from './BadgeCard';
import { logger } from '@/lib/logger';
import {
  getAllBadges,
  getUserBadges,
  getBadgeProgress,
  getUserBadgeStats,
} from '@/lib/services/achievement-service';

interface BadgeCollectionProps {
  userId: string;
  spaceId: string;
}

type FilterCategory = 'all' | string;
type FilterRarity = 'all' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
type FilterStatus = 'all' | 'earned' | 'locked';

/** Displays a complete collection of earned and available goal badges. */
export default function BadgeCollection({ userId, spaceId }: BadgeCollectionProps) {
  const [allBadges, setAllBadges] = useState<AchievementBadge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<Array<AchievementBadge & { progress: BadgeProgress }>>([]);
  const [stats, setStats] = useState({
    totalBadges: 0,
    totalPoints: 0,
    byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    byCategory: {} as Record<string, number>,
  });

  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [badges, earned, progress, badgeStats] = await Promise.all([
        getAllBadges(),
        getUserBadges(userId, spaceId),
        getBadgeProgress(userId, spaceId),
        getUserBadgeStats(userId, spaceId),
      ]);

      setAllBadges(badges);
      setUserBadges(earned);
      setBadgeProgress(progress);
      setStats(badgeStats);
    } catch (error) {
      logger.error('Error loading badge data:', error, { component: 'BadgeCollection', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [spaceId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter badges
  const filteredBadges = allBadges.filter((badge) => {
    // Category filter
    if (filterCategory !== 'all' && badge.category !== filterCategory) {
      return false;
    }

    // Rarity filter
    if (filterRarity !== 'all' && badge.rarity !== filterRarity) {
      return false;
    }

    // Status filter
    const isEarned = userBadges.some((ub) => ub.badge_id === badge.id);
    if (filterStatus === 'earned' && !isEarned) {
      return false;
    }
    if (filterStatus === 'locked' && isEarned) {
      return false;
    }

    return true;
  });

  // Get user badge and progress for a badge
  const getUserBadgeForBadge = (badgeId: string) => {
    return userBadges.find((ub) => ub.badge_id === badgeId);
  };

  const getProgressForBadge = (badgeId: string) => {
    return badgeProgress.find((bp) => bp.id === badgeId)?.progress;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">
            {stats.totalBadges}
          </div>
          <div className="text-sm text-gray-400">Total Badges</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-amber-400">
            {stats.totalPoints}
          </div>
          <div className="text-sm text-gray-400">Total Points</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-purple-400">
            {stats.byRarity.epic + stats.byRarity.legendary}
          </div>
          <div className="text-sm text-gray-400">Epic+ Badges</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-indigo-400">
            {Math.round((stats.totalBadges / allBadges.length) * 100)}%
          </div>
          <div className="text-sm text-gray-400">Collection Progress</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {(['all', 'earned', 'locked'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      filterStatus === status
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as FilterCategory)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-700 text-white text-sm"
            >
              <option value="all">All Categories</option>
              <option value="goals">Goals</option>
              <option value="milestones">Milestones</option>
              <option value="streaks">Streaks</option>
              <option value="social">Social</option>
              <option value="special">Special</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>

          {/* Rarity Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rarity
            </label>
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value as FilterRarity)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-700 text-white text-sm"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No badges found
          </h3>
          <p className="text-gray-400">
            Try adjusting your filters or complete more goals to earn badges!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              userBadge={getUserBadgeForBadge(badge.id)}
              progress={getProgressForBadge(badge.id)}
              showProgress={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
