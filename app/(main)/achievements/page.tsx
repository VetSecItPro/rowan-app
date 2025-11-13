'use client';

import { useState, useEffect } from 'react';
import { Trophy, Star, Award, TrendingUp, Target, Calendar } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { BadgeGallery } from '@/components/achievements/BadgeGallery';
import { BadgeCard } from '@/components/achievements/BadgeCard';
import { AchievementNotification, useAchievementNotifications } from '@/components/achievements/AchievementNotification';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { OnlineUsersIndicator } from '@/components/shared/PresenceIndicator';
import {
  achievementBadgesService,
  AchievementBadge,
  UserAchievement,
  AchievementProgress,
  BadgeStats,
  getAchievementLevel
} from '@/lib/services/achievement-badges-service';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { usePresence } from '@/lib/hooks/usePresence';
import { toast } from 'sonner';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';

export default function AchievementsPage() {
  const { currentSpace, user } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'recent' | 'all' | 'progress'>('recent');

  const { notifications, showNotification, hideNotification } = useAchievementNotifications();

  // Presence tracking
  const { onlineUsers } = usePresence({
    channelName: 'achievements-presence',
    spaceId: spaceId || '',
    userId: user?.id || '',
    userEmail: user?.email,
  });

  useEffect(() => {
    loadAchievementData();
  }, [spaceId, user]);

  const loadAchievementData = async () => {
    if (!spaceId || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [allBadges, userBadges, userProgress, badgeStats] = await Promise.all([
        achievementBadgesService.getAllBadges(),
        achievementBadgesService.getUserBadges(user.id, spaceId),
        achievementBadgesService.getUserBadgeProgress(user.id, spaceId),
        achievementBadgesService.getUserBadgeStats(user.id, spaceId)
      ]);

      setBadges(allBadges);
      setUserAchievements(userBadges);
      setProgress(userProgress);
      setStats(badgeStats);
    } catch (error) {
      console.error('Failed to load achievement data:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckForNewBadges = async () => {
    if (!user || !spaceId) return;

    try {
      const newBadges = await achievementBadgesService.checkAndAwardBadges(
        user.id,
        spaceId,
        'manual_check'
      );

      if (newBadges.length > 0) {
        toast.success(`🎉 You earned ${newBadges.length} new badge${newBadges.length > 1 ? 's' : ''}!`);

        // Show notifications for new badges
        newBadges.forEach(badge => {
          if (badge.badge) {
            showNotification(badge as UserAchievement & { badge: AchievementBadge });
          }
        });

        // Reload data to show new achievements
        loadAchievementData();
      } else {
        toast.info('No new badges earned yet. Keep working on your goals!');
      }
    } catch (error) {
      console.error('Failed to check for new badges:', error);
      toast.error('Failed to check for new badges');
    }
  };

  // Get recent achievements (last 5)
  const recentAchievements = userAchievements.slice(0, 5);

  // Get achievement level info
  const levelInfo = stats ? getAchievementLevel(stats.total_points) : null;

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Achievements' }]}>
      <PullToRefresh onRefresh={loadAchievementData} disabled={loading}>
        <div className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    Achievements
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Unlock badges and track your progress
                  </p>
                </div>
                {/* Online users indicator */}
                {onlineUsers.length > 0 && (
                  <div className="mt-2 sm:mt-0 sm:ml-4">
                    <OnlineUsersIndicator count={onlineUsers.length} />
                  </div>
                )}
              </div>

              <button
                onClick={handleCheckForNewBadges}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                <span>Check for New Badges</span>
              </button>
            </div>

            {/* Stats Overview */}
            {stats && levelInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Achievement Level */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-purple-600 dark:text-purple-400 font-medium text-sm">Achievement Level</h3>
                    <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      Level {levelInfo.level}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      {levelInfo.title}
                    </div>
                    <div className="text-xs text-purple-500 dark:text-purple-400">
                      {stats.total_points} / {levelInfo.nextLevelPoints} points
                    </div>
                  </div>
                </div>

                {/* Total Points */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Total Points</h3>
                    <Star className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {stats.total_points.toLocaleString()}
                  </div>
                </div>

                {/* Badges Earned */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-green-600 dark:text-green-400 font-medium text-sm">Badges Earned</h3>
                    <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {stats.earned_badges} / {stats.total_badges}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {stats.completion_percentage}% complete
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-blue-600 dark:text-blue-400 font-medium text-sm">In Progress</h3>
                    <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {progress.length}
                  </div>
                </div>
              </div>
            )}

            {/* Category Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setSelectedCategory('recent')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium flex-1 sm:flex-initial ${
                  selectedCategory === 'recent'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Recent</span>
              </button>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium flex-1 sm:flex-initial ${
                  selectedCategory === 'all'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm">All Badges</span>
              </button>
              <button
                onClick={() => setSelectedCategory('progress')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium flex-1 sm:flex-initial ${
                  selectedCategory === 'progress'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <Target className="w-4 h-4" />
                <span className="text-sm">Progress</span>
              </button>
            </div>

            {/* Content */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
              {selectedCategory === 'recent' ? (
                /* Recent Achievements */
                <div className="space-y-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Recent Achievements ({recentAchievements.length})
                  </h2>
                  {recentAchievements.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No achievements yet</p>
                      <p className="text-gray-500 dark:text-gray-500">Start completing goals to earn your first badges!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {recentAchievements.map((achievement) => (
                        <BadgeCard
                          key={achievement.id}
                          badge={achievement.badge!}
                          userAchievement={achievement}
                          size="medium"
                          showProgress={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedCategory === 'progress' ? (
                /* Progress View */
                <div className="space-y-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Badge Progress ({progress.length})
                  </h2>
                  {progress.length === 0 ? (
                    <div className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No progress to show</p>
                      <p className="text-gray-500 dark:text-gray-500">Complete goals and milestones to start earning badges!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {progress.map((progressItem) => (
                        <BadgeCard
                          key={progressItem.id}
                          badge={progressItem.badge!}
                          progress={{
                            current: progressItem.current_progress,
                            target: progressItem.target_progress,
                            percentage: Math.round((progressItem.current_progress / progressItem.target_progress) * 100)
                          }}
                          size="medium"
                          showProgress={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* All Badges Gallery */
                <BadgeGallery
                  badges={badges}
                  userAchievements={userAchievements}
                  progress={progress}
                  showSearch={true}
                  showFilters={true}
                />
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Achievement Notifications */}
      {notifications.map((notification) => (
        <AchievementNotification
          key={notification.id}
          achievement={notification}
          isVisible={true}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </FeatureLayout>
  );
}
