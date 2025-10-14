import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

// =============================================
// TYPES & VALIDATION
// =============================================

export type NotificationType =
  | 'due'
  | 'overdue'
  | 'assigned'
  | 'unassigned'
  | 'mentioned'
  | 'commented'
  | 'completed'
  | 'snoozed';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'never';

export interface ReminderNotification {
  id: string;
  reminder_id: string;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_read: boolean;
  sent_at?: string;
  created_at: string;
  reminder?: {
    id: string;
    title: string;
    emoji?: string;
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  space_id?: string;
  email_enabled: boolean;
  email_due_reminders: boolean;
  email_assignments: boolean;
  email_mentions: boolean;
  email_comments: boolean;
  in_app_enabled: boolean;
  in_app_due_reminders: boolean;
  in_app_assignments: boolean;
  in_app_mentions: boolean;
  in_app_comments: boolean;
  notification_frequency: NotificationFrequency;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  created_at: string;
  updated_at: string;
}

// Zod schemas
const CreateNotificationSchema = z.object({
  reminder_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['due', 'overdue', 'assigned', 'unassigned', 'mentioned', 'commented', 'completed', 'snoozed']),
  channel: z.enum(['in_app', 'email', 'push']),
});

const UpdatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_due_reminders: z.boolean().optional(),
  email_assignments: z.boolean().optional(),
  email_mentions: z.boolean().optional(),
  email_comments: z.boolean().optional(),
  in_app_enabled: z.boolean().optional(),
  in_app_due_reminders: z.boolean().optional(),
  in_app_assignments: z.boolean().optional(),
  in_app_mentions: z.boolean().optional(),
  in_app_comments: z.boolean().optional(),
  notification_frequency: z.enum(['instant', 'hourly', 'daily', 'never']).optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().optional(),
  quiet_hours_end: z.string().optional(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

// =============================================
// SERVICE
// =============================================

export const reminderNotificationsService = {
  /**
   * Create a notification for a user
   * Checks user preferences before creating
   */
  async createNotification(input: CreateNotificationInput): Promise<ReminderNotification | null> {
    const supabase = createClient();

    // Validate input
    const validated = CreateNotificationSchema.parse(input);

    // Get reminder details to fetch space_id
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('space_id')
      .eq('id', validated.reminder_id)
      .single();

    if (reminderError || !reminder) {
      console.error('Reminder not found:', reminderError);
      return null;
    }

    // Check if user should receive this notification
    const { data: shouldSend } = await supabase.rpc('should_send_notification', {
      p_user_id: validated.user_id,
      p_space_id: reminder.space_id,
      p_notification_type: validated.type,
      p_channel: validated.channel,
    });

    if (!shouldSend) {
      console.log('Notification blocked by user preferences');
      return null;
    }

    // Create notification
    const { data, error } = await supabase
      .from('reminder_notifications')
      .insert({
        reminder_id: validated.reminder_id,
        user_id: validated.user_id,
        type: validated.type,
        channel: validated.channel,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }

    return data;
  },

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ): Promise<ReminderNotification[]> {
    const supabase = createClient();
    const { unreadOnly = false, limit = 50, offset = 0 } = options || {};

    let query = supabase
      .from('reminder_notifications')
      .select(`
        *,
        reminder:reminder_id (
          id,
          title,
          emoji
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }

    return data || [];
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('reminder_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('reminder_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('reminder_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  },

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string, spaceId?: string): Promise<NotificationPreferences | null> {
    const supabase = createClient();

    let query = supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId);

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    } else {
      query = query.is('space_id', null);
    }

    const { data, error } = await query.single();

    if (error) {
      // If no preferences found, return defaults
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching preferences:', error);
      throw new Error('Failed to fetch preferences');
    }

    return data;
  },

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    spaceId: string | null,
    updates: UpdatePreferencesInput
  ): Promise<NotificationPreferences> {
    const supabase = createClient();

    // Validate updates
    const validated = UpdatePreferencesSchema.parse(updates);

    // Check if preferences exist
    const existing = await this.getPreferences(userId, spaceId || undefined);

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        throw new Error('Failed to update preferences');
      }

      return data;
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: userId,
          space_id: spaceId,
          ...validated,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating preferences:', error);
        throw new Error('Failed to create preferences');
      }

      return data;
    }
  },

  /**
   * Format notification message for display
   */
  formatNotificationMessage(notification: ReminderNotification): string {
    const reminderTitle = notification.reminder?.title || 'A reminder';
    const emoji = notification.reminder?.emoji || '🔔';

    switch (notification.type) {
      case 'due':
        return `${emoji} ${reminderTitle} is due now`;

      case 'overdue':
        return `${emoji} ${reminderTitle} is overdue`;

      case 'assigned':
        return `${emoji} You were assigned to ${reminderTitle}`;

      case 'unassigned':
        return `${emoji} You were unassigned from ${reminderTitle}`;

      case 'mentioned':
        return `${emoji} You were mentioned in ${reminderTitle}`;

      case 'commented':
        return `${emoji} New comment on ${reminderTitle}`;

      case 'completed':
        return `${emoji} ${reminderTitle} was completed`;

      case 'snoozed':
        return `${emoji} ${reminderTitle} was snoozed`;

      default:
        return `${emoji} Update on ${reminderTitle}`;
    }
  },

  /**
   * Get notification icon for display
   */
  getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      due: 'Bell',
      overdue: 'AlertCircle',
      assigned: 'UserCheck',
      unassigned: 'UserX',
      mentioned: 'AtSign',
      commented: 'MessageSquare',
      completed: 'CheckCircle',
      snoozed: 'Clock',
    };

    return iconMap[type] || 'Bell';
  },

  /**
   * Get notification color for display
   */
  getNotificationColor(type: NotificationType): string {
    const colorMap: Record<NotificationType, string> = {
      due: 'text-blue-600 dark:text-blue-400',
      overdue: 'text-red-600 dark:text-red-400',
      assigned: 'text-green-600 dark:text-green-400',
      unassigned: 'text-gray-600 dark:text-gray-400',
      mentioned: 'text-purple-600 dark:text-purple-400',
      commented: 'text-pink-600 dark:text-pink-400',
      completed: 'text-green-600 dark:text-green-400',
      snoozed: 'text-purple-600 dark:text-purple-400',
    };

    return colorMap[type] || 'text-gray-600 dark:text-gray-400';
  },
};
