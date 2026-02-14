'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Search, Filter, Trophy } from 'lucide-react';
import { BadgeCard } from './BadgeCard';
import { BadgeModal } from './BadgeModal';
import {
  AchievementBadge,
  UserAchievement,
  BadgeCategory,
  BadgeRarity,
  AchievementProgress
} from '@/lib/services/achievement-badges-service';
import { cn } from '@/lib/utils';

interface BadgeGalleryProps {
  badges: AchievementBadge[];
  userAchievements: UserAchievement[];
  progress?: AchievementProgress[];
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  defaultFilter?: BadgeCategory | 'all';
}

/** Displays a gallery grid of all available achievement badges. */
export function BadgeGallery({
  badges,
  userAchievements,
  progress = [],
  className,
  showSearch = true,
  showFilters = true,
  defaultFilter = 'all'
}: BadgeGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>(defaultFilter);
  const [selectedRarity, setSelectedRarity] = useState<BadgeRarity | 'all'>('all');
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  // Create lookup maps for performance
  const achievementMap = useMemo(() => {
    const map = new Map<string, UserAchievement>();
    userAchievements.forEach(achievement => {
      map.set(achievement.badge_id, achievement);
    });
    return map;
  }, [userAchievements]);

  const progressMap = useMemo(() => {
    const map = new Map<string, AchievementProgress>();
    progress.forEach(p => {
      map.set(p.badge_id, p);
    });
    return map;
  }, [progress]);

  // Filter badges based on current criteria - using debounced search to prevent excessive recalculations
  const filteredBadges = useMemo(() => {
    let filtered = badges;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(badge => badge.category === selectedCategory);
    }

    // Rarity filter
    if (selectedRarity !== 'all') {
      filtered = filtered.filter(badge => badge.rarity === selectedRarity);
    }

    // Earned only filter
    if (showEarnedOnly) {
      filtered = filtered.filter(badge => achievementMap.has(badge.id));
    }

    // Search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(badge =>
        badge.name.toLowerCase().includes(query) ||
        badge.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [badges, selectedCategory, selectedRarity, showEarnedOnly, debouncedSearchQuery, achievementMap]);

  const categoryLabels: Record<BadgeCategory, string> = {
    goals: 'Goals',
    milestones: 'Milestones',
    streaks: 'Streaks',
    social: 'Social',
    special: 'Special',
    seasonal: 'Seasonal'
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* Search Bar */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search badges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
          )}

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as BadgeCategory | 'all')}
                  className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-white"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Rarity Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">Rarity:</span>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value as BadgeRarity | 'all')}
                  className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-md text-sm text-white"
                >
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="uncommon">Uncommon</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>

              {/* Earned Only Toggle */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showEarnedOnly}
                  onChange={(e) => setShowEarnedOnly(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-300">Earned only</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-white">{filteredBadges.length}</div>
          <div className="text-sm text-gray-400">Total Badges</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{userAchievements.length}</div>
          <div className="text-sm text-gray-400">Earned</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{progress.length}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">
            {userAchievements.reduce((sum, achievement) => sum + (achievement.badge?.points || 0), 0)}
          </div>
          <div className="text-sm text-gray-400">Total Points</div>
        </div>
      </div>

      {/* Badge Grid */}
      {filteredBadges.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No badges found</p>
          <p className="text-gray-400">
            {searchQuery || selectedCategory !== 'all' || selectedRarity !== 'all' || showEarnedOnly
              ? 'Try adjusting your filters'
              : 'Complete goals and milestones to start earning badges!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredBadges.map((badge) => {
            const achievement = achievementMap.get(badge.id);
            const badgeProgress = progressMap.get(badge.id);
            const progressData = badgeProgress ? {
              current: badgeProgress.current_progress,
              target: badgeProgress.target_progress,
              percentage: Math.round((badgeProgress.current_progress / badgeProgress.target_progress) * 100)
            } : undefined;

            return (
              <BadgeCard
                key={badge.id}
                badge={badge}
                userAchievement={achievement}
                progress={progressData}
                onClick={() => setSelectedBadge(badge)}
                size="medium"
                showProgress={true}
              />
            );
          })}
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeModal
          badge={selectedBadge}
          userAchievement={achievementMap.get(selectedBadge.id)}
          progress={progressMap.get(selectedBadge.id)}
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}
