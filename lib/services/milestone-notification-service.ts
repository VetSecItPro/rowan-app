import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface Notification {
  id: string;
  user_id: string;
  space_id: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  type: string;
  target_value: number | null;
  current_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneCelebration {
  milestone_id: string;
  goal_id: string;
  goal_title: string;
  milestone_title: string;
  milestone_description: string | null;
  completed_at: string;
  percentage_reached: number;
}

// ==================== NOTIFICATIONS ====================

/**
 * Gets all notifications for the current user
 */
export async function getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('Error fetching notifications from notifications table:', { component: 'lib-milestone-notification-service', error: error });
      return [];
    }
    return data || [];
  } catch (error) {
    logger.warn('Failed to fetch notifications:', { component: 'lib-milestone-notification-service', error: error });
    return [];
  }
}

/**
 * Gets unread notifications count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.warn('Error fetching unread notification count:', { component: 'lib-milestone-notification-service', error: error });
      return 0;
    }
    return count || 0;
  } catch (error) {
    logger.warn('Failed to fetch unread notification count:', { component: 'lib-milestone-notification-service', error: error });
    return 0;
  }
}

/**
 * Marks a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      logger.warn('Error marking notification as read:', { component: 'lib-milestone-notification-service', error: error });
    }
  } catch (error) {
    logger.warn('Failed to mark notification as read:', { component: 'lib-milestone-notification-service', error: error });
  }
}

/**
 * Marks all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.warn('Error marking all notifications as read:', { component: 'lib-milestone-notification-service', error: error });
    }
  } catch (error) {
    logger.warn('Failed to mark all notifications as read:', { component: 'lib-milestone-notification-service', error: error });
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);

    if (error) {
      logger.warn('Error deleting notification:', { component: 'lib-milestone-notification-service', error: error });
    }
  } catch (error) {
    logger.warn('Failed to delete notification:', { component: 'lib-milestone-notification-service', error: error });
  }
}

/**
 * Gets goal milestone notifications
 */
export async function getGoalMilestoneNotifications(
  userId: string,
  limit = 10
): Promise<Notification[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'goal_milestone')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ==================== MILESTONES ====================

/**
 * Gets all milestones for a goal
 */
export async function getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('target_value', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Gets completed milestones for a goal
 */
export async function getCompletedMilestones(goalId: string): Promise<GoalMilestone[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .eq('completed', true)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets next milestone to reach for a goal
 */
export async function getNextMilestone(goalId: string): Promise<GoalMilestone | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .eq('completed', false)
    .eq('type', 'percentage')
    .order('target_value', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data;
}

/**
 * Gets recent milestone celebrations for a space
 */
export async function getRecentMilestoneCelebrations(
  spaceId: string,
  days = 7
): Promise<MilestoneCelebration[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_recent_milestone_celebrations', {
    p_space_id: spaceId,
    p_days: days,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Checks if a goal has any completed milestones
 */
export async function hasCompletedMilestones(goalId: string): Promise<boolean> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('goal_milestones')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .eq('completed', true);

  if (error) throw error;
  return (count || 0) > 0;
}

/**
 * Gets milestone completion percentage for a goal
 */
export async function getMilestoneCompletionPercentage(goalId: string): Promise<number> {
  const supabase = createClient();

  // Get total milestones count
  const { count: totalCount, error: totalError } = await supabase
    .from('goal_milestones')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .eq('type', 'percentage');

  if (totalError) throw totalError;

  // Get completed milestones count
  const { count: completedCount, error: completedError } = await supabase
    .from('goal_milestones')
    .select('*', { count: 'exact', head: true })
    .eq('goal_id', goalId)
    .eq('type', 'percentage')
    .eq('completed', true);

  if (completedError) throw completedError;

  if (!totalCount || totalCount === 0) return 0;
  return Math.round(((completedCount || 0) / totalCount) * 100);
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================

/**
 * Subscribe to new notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        callback(payload.new as unknown as Notification);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to milestone completions for a goal
 */
export function subscribeToMilestoneCompletions(
  goalId: string,
  callback: (milestone: GoalMilestone) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`goal-milestones-${goalId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'goal_milestones',
        filter: `goal_id=eq.${goalId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const milestone = payload.new as unknown as GoalMilestone;
        if (milestone.completed) {
          callback(milestone);
        }
      }
    )
    .subscribe();

  return channel;
}

// Export service object
export const milestoneNotificationService = {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getGoalMilestoneNotifications,
  getGoalMilestones,
  getCompletedMilestones,
  getNextMilestone,
  getRecentMilestoneCelebrations,
  hasCompletedMilestones,
  getMilestoneCompletionPercentage,
  subscribeToNotifications,
  subscribeToMilestoneCompletions,
};
