import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { notificationQueueService } from './notification-queue-service';

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
   * Check if current time is within quiet hours
   */
  async isInQuietHours(userId: string, spaceId?: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('is_in_quiet_hours', {
      p_user_id: userId,
      p_space_id: spaceId || null,
      p_check_time: new Date().toISOString(),
    });

    if (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }

    return data || false;
  },

  /**
   * Create a notification for a user
   * Handles quiet hours, batching, and all delivery channels
   */
  async createNotification(input: CreateNotificationInput): Promise<ReminderNotification | null> {
    const supabase = createClient();

    // Validate input
    const validated = CreateNotificationSchema.parse(input);

    // Get reminder details to fetch space_id
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('space_id, title, emoji')
      .eq('id', validated.reminder_id)
      .single();

    if (reminderError || !reminder) {
      console.error('Reminder not found:', reminderError);
      return null;
    }

    // Get user preferences
    const prefs = await this.getPreferences(validated.user_id, reminder.space_id);

    if (!prefs) {
      console.log('No preferences found for user, using defaults');
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

    // Create in-app notification (always created for history)
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

    // Handle email and push notifications based on frequency and quiet hours
    if (prefs) {
      const frequency = prefs.notification_frequency || 'instant';
      const inQuietHours = await this.isInQuietHours(validated.user_id, reminder.space_id);

      // Queue for batching if not instant, or if in quiet hours
      if (frequency !== 'instant' || inQuietHours) {
        await notificationQueueService.queueNotification(
          validated.user_id,
          reminder.space_id,
          validated.type,
          {
            reminder_id: validated.reminder_id,
            title: reminder.title,
            emoji: reminder.emoji,
            type: validated.type,
            channel: validated.channel,
          },
          frequency
        );
      } else {
        // Send immediately
        await this.sendImmediateNotification(validated, reminder);
      }
    } else {
      // No preferences, send immediately
      await this.sendImmediateNotification(validated, reminder);
    }

    return data;
  },

  /**
   * Send immediate notification (email + push)
   */
  async sendImmediateNotification(
    input: CreateNotificationInput,
    reminder: { title: string; emoji?: string }
  ): Promise<void> {
    // Send email if channel is email
    if (input.channel === 'email') {
      await this.sendEmailNotification(input.user_id, input.type, reminder);
    }

    // Send push if channel is push
    if (input.channel === 'push') {
      await this.sendPushNotification(input.user_id, input.type, reminder);
    }
  },

  /**
   * Send email notification
   */
  async sendEmailNotification(
    userId: string,
    type: NotificationType,
    reminder: { title: string; emoji?: string }
  ): Promise<void> {
    // TODO: Integrate with email service (Resend)
    console.log('Sending email notification:', {
      userId,
      type,
      reminder,
    });
  },

  /**
   * Send push notification
   */
  async sendPushNotification(
    userId: string,
    type: NotificationType,
    reminder: { title: string; emoji?: string }
  ): Promise<void> {
    try {
      const title = this.formatNotificationTitle(type);
      const body = this.formatNotificationBody(type, reminder);

      await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          bodyText: body,
          icon: `/icons/${reminder.emoji || '🔔'}.png`,
          tag: `reminder-${type}`,
        }),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  },

  /**
   * Format notification title
   */
  formatNotificationTitle(type: NotificationType): string {
    const titleMap: Record<NotificationType, string> = {
      due: 'Reminder Due',
      overdue: 'Reminder Overdue',
      assigned: 'New Assignment',
      unassigned: 'Unassigned',
      mentioned: 'You were mentioned',
      commented: 'New Comment',
      completed: 'Reminder Completed',
      snoozed: 'Reminder Snoozed',
    };

    return titleMap[type] || 'Notification';
  },

  /**
   * Format notification body
   */
  formatNotificationBody(type: NotificationType, reminder: { title: string; emoji?: string }): string {
    const emoji = reminder.emoji || '🔔';

    const bodyMap: Record<NotificationType, string> = {
      due: `${emoji} ${reminder.title} is due now`,
      overdue: `${emoji} ${reminder.title} is overdue`,
      assigned: `${emoji} You were assigned to ${reminder.title}`,
      unassigned: `${emoji} You were unassigned from ${reminder.title}`,
      mentioned: `${emoji} You were mentioned in ${reminder.title}`,
      commented: `${emoji} New comment on ${reminder.title}`,
      completed: `${emoji} ${reminder.title} was completed`,
      snoozed: `${emoji} ${reminder.title} was snoozed`,
    };

    return bodyMap[type] || `${emoji} Update on ${reminder.title}`;
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
