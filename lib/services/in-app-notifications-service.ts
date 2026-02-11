import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Comprehensive notification types
export type NotificationType =
  | 'task'
  | 'event'
  | 'message'
  | 'shopping'
  | 'meal'
  | 'reminder'
  | 'milestone'
  | 'goal_update'
  | 'expense'
  | 'bill_due'
  | 'space_invite'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface InAppNotification {
  id: string;
  user_id: string;
  partnership_id?: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  is_read: boolean;
  space_id?: string;
  space_name?: string;
  related_item_id?: string;
  related_item_type?: string;
  action_url?: string;
  emoji?: string;
  sender_id?: string;
  sender_name?: string;
  created_at: string;
  read_at?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreateNotificationInput {
  user_id: string;
  partnership_id?: string;
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  space_id?: string;
  space_name?: string;
  related_item_id?: string;
  related_item_type?: string;
  action_url?: string;
  emoji?: string;
  sender_id?: string;
  sender_name?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  is_read?: boolean;
  priority?: NotificationPriority;
  space_id?: string;
}

export class InAppNotificationsService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient ?? createClient();
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<InAppNotification[]> {
    try {
      let query = this.supabase
        .from('in_app_notifications')
        .select('id, user_id, partnership_id, type, title, content, priority, is_read, space_id, space_name, related_item_id, related_item_type, action_url, emoji, sender_id, sender_name, created_at, read_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.space_id) {
        query = query.eq('space_id', filters.space_id);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching notifications:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getUserNotifications:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return [];
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('in_app_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('Error getting unread count:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error in getUnreadCount:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return 0;
    }
  }

  /**
   * Get unread count by type
   */
  async getUnreadCountByType(userId: string): Promise<Record<NotificationType, number>> {
    try {
      const { data, error } = await this.supabase
        .from('in_app_notifications')
        .select('type')
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('Error getting unread count by type:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return {} as Record<NotificationType, number>;
      }

      const counts: Record<string, number> = {};
      data?.forEach((item: { type: string }) => {
        counts[item.type] = (counts[item.type] || 0) + 1;
      });

      return counts as Record<NotificationType, number>;
    } catch (error) {
      logger.error('Error in getUnreadCountByType:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return {} as Record<NotificationType, number>;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(input: CreateNotificationInput): Promise<boolean> {
    try {
      const notification = {
        ...input,
        priority: input.priority || 'normal',
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('in_app_notifications')
        .insert([notification]);

      if (error) {
        logger.error('Error creating notification:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in createNotification:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return false;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        logger.error('Error marking notification as read:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in markAsRead:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        logger.error('Error marking all notifications as read:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in markAllAsRead:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('in_app_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        logger.error('Error deleting notification:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteNotification:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return false;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('in_app_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true);

      if (error) {
        logger.error('Error deleting read notifications:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteAllRead:', error, { component: 'lib-in-app-notifications-service', action: 'service_call' });
      return false;
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      task: '✅',
      event: '📅',
      message: '💬',
      shopping: '🛒',
      meal: '🍽️',
      reminder: '📝',
      milestone: '🎯',
      goal_update: '🎯',
      expense: '💰',
      bill_due: '📄',
      space_invite: '👥',
      system: '⚙️'
    };

    return icons[type] || '🔔';
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      task: 'blue',
      event: 'purple',
      message: 'green',
      shopping: 'emerald',
      meal: 'orange',
      reminder: 'pink',
      milestone: 'indigo',
      goal_update: 'indigo',
      expense: 'amber',
      bill_due: 'red',
      space_invite: 'cyan',
      system: 'gray'
    };

    return colors[type] || 'gray';
  }

  /**
   * Get priority indicator color
   */
  getPriorityColor(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      low: 'bg-gray-400',
      normal: 'bg-blue-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500'
    };

    return colors[priority] || 'bg-gray-400';
  }

  /**
   * Format notification time
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Export singleton instance
export const inAppNotificationsService = new InAppNotificationsService();
