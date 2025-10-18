import { createClient } from '@/lib/supabase/client';

// =====================================================
// TYPES
// =====================================================

export type BadgeCategory = 'goals' | 'milestones' | 'streaks' | 'social' | 'special' | 'seasonal';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  color: string;
  criteria: Record<string, any>;
  points: number;
  rarity: BadgeRarity;
  is_active: boolean;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  space_id: string;
  badge_id: string;
  earned_at: string;
  progress_data?: Record<string, any>;
  badge?: AchievementBadge;
}

export interface AchievementProgress {
  id: string;
  user_id: string;
  space_id: string;
  badge_id: string;
  current_progress: number;
  target_progress: number;
  progress_data: Record<string, any>;
  last_updated: string;
  badge?: AchievementBadge;
}

export interface BadgeStats {
  total_badges: number;
  earned_badges: number;
  total_points: number;
  badges_by_rarity: Record<BadgeRarity, number>;
  badges_by_category: Record<BadgeCategory, number>;
  completion_percentage: number;
}

// =====================================================
// BADGE MANAGEMENT
// =====================================================

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<AchievementBadge[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('achievement_badges')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('points', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get badges by category
 */
export async function getBadgesByCategory(category: BadgeCategory): Promise<AchievementBadge[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('achievement_badges')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('points', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get user's earned badges in a space
 */
export async function getUserBadges(userId: string, spaceId: string): Promise<UserAchievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      badge:achievement_badges(*)
    `)
    .eq('user_id', userId)
    .eq('space_id', spaceId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get user's badge progress
 */
export async function getUserBadgeProgress(userId: string, spaceId: string): Promise<AchievementProgress[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('achievement_progress')
    .select(`
      *,
      badge:achievement_badges(*)
    `)
    .eq('user_id', userId)
    .eq('space_id', spaceId)
    .order('current_progress', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Calculate badge statistics for a user
 */
export async function getUserBadgeStats(userId: string, spaceId: string): Promise<BadgeStats> {
  const [allBadges, userBadges] = await Promise.all([
    getAllBadges(),
    getUserBadges(userId, spaceId)
  ]);

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  const earnedBadges = allBadges.filter(badge => earnedBadgeIds.has(badge.id));

  const total_badges = allBadges.length;
  const earned_badges = earnedBadges.length;
  const total_points = earnedBadges.reduce((sum, badge) => sum + badge.points, 0);

  const badges_by_rarity: Record<BadgeRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };

  const badges_by_category: Record<BadgeCategory, number> = {
    goals: 0,
    milestones: 0,
    streaks: 0,
    social: 0,
    special: 0,
    seasonal: 0
  };

  earnedBadges.forEach(badge => {
    badges_by_rarity[badge.rarity]++;
    badges_by_category[badge.category]++;
  });

  const completion_percentage = total_badges > 0 ? Math.round((earned_badges / total_badges) * 100) : 0;

  return {
    total_badges,
    earned_badges,
    total_points,
    badges_by_rarity,
    badges_by_category,
    completion_percentage
  };
}

// =====================================================
// BADGE EVALUATION & AWARDING
// =====================================================

/**
 * Check and award badges for a user based on current achievements
 */
export async function checkAndAwardBadges(
  userId: string,
  spaceId: string,
  triggerType: string = 'manual_check'
): Promise<UserAchievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('check_and_award_badges', {
      p_user_id: userId,
      p_space_id: spaceId,
      p_trigger_type: triggerType
    });

  if (error) throw error;

  // Return the newly awarded badges
  const awardedBadges = data?.badges_awarded || [];

  // Convert to UserAchievement format
  return awardedBadges.map((badge: any) => ({
    id: '', // Will be generated by DB
    user_id: userId,
    space_id: spaceId,
    badge_id: badge.id,
    earned_at: new Date().toISOString(),
    badge: badge
  }));
}

/**
 * Update badge progress for a user
 */
export async function updateBadgeProgress(
  userId: string,
  spaceId: string,
  badgeId: string,
  progress: number,
  progressData: Record<string, any> = {}
): Promise<void> {
  const supabase = createClient();

  // Get badge to determine target progress
  const { data: badge, error: badgeError } = await supabase
    .from('achievement_badges')
    .select('criteria')
    .eq('id', badgeId)
    .single();

  if (badgeError) throw badgeError;

  const targetProgress = badge.criteria.count || badge.criteria.target || 100;

  const { error } = await supabase
    .from('achievement_progress')
    .upsert({
      user_id: userId,
      space_id: spaceId,
      badge_id: badgeId,
      current_progress: progress,
      target_progress: targetProgress,
      progress_data: progressData
    }, {
      onConflict: 'user_id,space_id,badge_id'
    });

  if (error) throw error;

  // Check if badge should be awarded
  if (progress >= targetProgress) {
    await checkAndAwardBadges(userId, spaceId, 'progress_complete');
  }
}

/**
 * Get recent badge activities (for activity feeds)
 */
export async function getRecentBadgeActivities(spaceId: string, limit: number = 10): Promise<UserAchievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      badge:achievement_badges(*),
      user:auth.users(email)
    `)
    .eq('space_id', spaceId)
    .order('earned_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// =====================================================
// BADGE UTILITIES
// =====================================================

/**
 * Get badge rarity color
 */
export function getBadgeRarityColor(rarity: BadgeRarity): string {
  const colors = {
    common: 'gray',
    uncommon: 'green',
    rare: 'blue',
    epic: 'purple',
    legendary: 'orange'
  };
  return colors[rarity] || 'gray';
}

/**
 * Get badge category icon
 */
export function getBadgeCategoryIcon(category: BadgeCategory): string {
  const icons = {
    goals: 'Target',
    milestones: 'Flag',
    streaks: 'Flame',
    social: 'Users',
    special: 'Star',
    seasonal: 'Calendar'
  };
  return icons[category] || 'Award';
}

/**
 * Format badge points for display
 */
export function formatBadgePoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`;
  }
  return points.toString();
}

/**
 * Get achievement level based on total points
 */
export function getAchievementLevel(points: number): { level: number; title: string; nextLevelPoints: number } {
  const levels = [
    { level: 1, title: 'Beginner', points: 0 },
    { level: 2, title: 'Achiever', points: 100 },
    { level: 3, title: 'Expert', points: 250 },
    { level: 4, title: 'Master', points: 500 },
    { level: 5, title: 'Legend', points: 1000 },
    { level: 6, title: 'Mythic', points: 2000 }
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = 0; i < levels.length - 1; i++) {
    if (points >= levels[i].points && points < levels[i + 1].points) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1];
      break;
    }
  }

  // If at max level
  if (points >= levels[levels.length - 1].points) {
    currentLevel = levels[levels.length - 1];
    nextLevel = currentLevel;
  }

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextLevelPoints: nextLevel.points
  };
}

// Export service object
export const achievementBadgesService = {
  getAllBadges,
  getBadgesByCategory,
  getUserBadges,
  getUserBadgeProgress,
  getUserBadgeStats,
  checkAndAwardBadges,
  updateBadgeProgress,
  getRecentBadgeActivities,
  getBadgeRarityColor,
  getBadgeCategoryIcon,
  formatBadgePoints,
  getAchievementLevel
};