// Phase 14: Chore Rewards & Gamification Types

// =============================================================================
// REWARD POINTS
// =============================================================================

export interface RewardPoints {
  id: string;
  user_id: string;
  space_id: string;
  points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// POINT TRANSACTIONS
// =============================================================================

export type PointSourceType =
  | 'chore'
  | 'task'
  | 'streak_bonus'
  | 'weekly_goal'
  | 'perfect_week'
  | 'redemption'
  | 'adjustment'
  | 'bonus';

export interface PointTransaction {
  id: string;
  user_id: string;
  space_id: string;
  source_type: PointSourceType;
  source_id: string | null;
  points: number; // Can be negative for redemptions
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreatePointTransactionInput {
  user_id: string;
  space_id: string;
  source_type: PointSourceType;
  source_id?: string;
  points: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// REWARDS CATALOG
// =============================================================================

export type RewardCategory =
  | 'screen_time'
  | 'treats'
  | 'activities'
  | 'money'
  | 'privileges'
  | 'other';

export interface RewardCatalogItem {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  cost_points: number;
  category: RewardCategory;
  image_url: string | null;
  emoji: string;
  is_active: boolean;
  max_redemptions_per_week: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardInput {
  space_id: string;
  name: string;
  description?: string;
  cost_points: number;
  category: RewardCategory;
  image_url?: string;
  emoji?: string;
  max_redemptions_per_week?: number;
  created_by: string;
}

export interface UpdateRewardInput {
  name?: string;
  description?: string;
  cost_points?: number;
  category?: RewardCategory;
  image_url?: string;
  emoji?: string;
  is_active?: boolean;
  max_redemptions_per_week?: number | null;
}

// =============================================================================
// REWARD REDEMPTIONS
// =============================================================================

export type RedemptionStatus =
  | 'pending'
  | 'approved'
  | 'fulfilled'
  | 'denied'
  | 'cancelled';

export interface RewardRedemption {
  id: string;
  user_id: string;
  space_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  approved_by: string | null;
  approved_at: string | null;
  fulfilled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  reward?: RewardCatalogItem;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CreateRedemptionInput {
  user_id: string;
  space_id: string;
  reward_id: string;
  points_spent: number;
}

// =============================================================================
// LEADERBOARD & STATS
// =============================================================================

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  level: number;
  current_streak: number;
  points_this_week: number;
  points_this_month: number;
  chores_completed_this_week: number;
  rank: number;
}

export interface UserRewardsStats {
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  points_this_week: number;
  points_this_month: number;
  chores_completed_today: number;
  chores_completed_this_week: number;
  pending_redemptions: number;
  next_level_points: number;
  progress_to_next_level: number; // 0-100 percentage
}

// =============================================================================
// LEVEL SYSTEM
// =============================================================================

export interface LevelDefinition {
  level: number;
  name: string;
  min_points: number;
  badge_emoji: string;
  color: string;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1, name: 'Starter', min_points: 0, badge_emoji: '🌱', color: 'gray' },
  { level: 2, name: 'Helper', min_points: 100, badge_emoji: '⭐', color: 'yellow' },
  { level: 3, name: 'Champion', min_points: 500, badge_emoji: '🏆', color: 'amber' },
  { level: 4, name: 'Superstar', min_points: 1000, badge_emoji: '🌟', color: 'orange' },
  { level: 5, name: 'Legend', min_points: 2500, badge_emoji: '👑', color: 'purple' },
  { level: 6, name: 'Master', min_points: 5000, badge_emoji: '💎', color: 'blue' },
];

// =============================================================================
// POINTS CONFIGURATION
// =============================================================================

export const POINTS_CONFIG = {
  // Base points per action
  CHORE_COMPLETE: 10, // Default, can be overridden per chore
  TASK_COMPLETE: 5,

  // Streak bonuses (added on top of base points)
  STREAK_BONUS_PER_DAY: 5, // +5 per day of streak
  MAX_STREAK_BONUS: 25, // Cap at 5-day streak bonus

  // Achievement bonuses
  WEEKLY_GOAL_BONUS: 50,
  PERFECT_WEEK_BONUS: 100, // All assigned chores completed

  // Streak thresholds for celebrations
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100],
} as const;

// =============================================================================
// DEFAULT REWARDS
// =============================================================================

export const DEFAULT_REWARDS: Omit<CreateRewardInput, 'space_id' | 'created_by'>[] = [
  {
    name: '30 min extra screen time',
    description: 'Earn 30 extra minutes of screen time',
    cost_points: 50,
    category: 'screen_time',
    emoji: '📱',
  },
  {
    name: 'Choose dinner',
    description: 'Pick what the family has for dinner',
    cost_points: 100,
    category: 'privileges',
    emoji: '🍕',
  },
  {
    name: 'Skip one chore',
    description: 'Get a pass on one assigned chore',
    cost_points: 75,
    category: 'privileges',
    emoji: '🎫',
    max_redemptions_per_week: 1,
  },
  {
    name: '$5 allowance bonus',
    description: 'Add $5 to your weekly allowance',
    cost_points: 200,
    category: 'money',
    emoji: '💵',
  },
  {
    name: 'Family movie pick',
    description: 'Choose the movie for family movie night',
    cost_points: 150,
    category: 'activities',
    emoji: '🎬',
  },
  {
    name: 'Stay up 30 min late',
    description: 'Extend bedtime by 30 minutes',
    cost_points: 75,
    category: 'privileges',
    emoji: '🌙',
    max_redemptions_per_week: 2,
  },
  {
    name: 'Special treat',
    description: 'Choose a special snack or dessert',
    cost_points: 50,
    category: 'treats',
    emoji: '🍦',
  },
  {
    name: 'Game time with parent',
    description: '30 minutes of one-on-one game time',
    cost_points: 100,
    category: 'activities',
    emoji: '🎮',
  },
];
