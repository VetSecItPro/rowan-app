import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { notificationQueueService } from './notification-queue-service';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

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
  | 'snoozed'
  | 'goal_checkin_due'
  | 'goal_checkin_overdue';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'never';

export interface ReminderNotification {
  id: string;
  reminder_id?: string | null;
  goal_id?: string | null;
  user_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title?: string;
  message?: string;
  is_read: boolean;
  sent_at?: string;
  created_at: string;
  reminder?: {
    id: string;
    title: string;
    emoji?: string;
  };
  goal?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  space_id?: string | null;
  // Email preferences — matching user_notification_preferences DB schema
  email_enabled: boolean;
  email_due_reminders: boolean;
  email_assignments: boolean;
  email_mentions: boolean;
  email_comments: boolean;
  // In-app preferences
  in_app_enabled: boolean;
  in_app_due_reminders: boolean;
  in_app_assignments: boolean;
  in_app_mentions: boolean;
  in_app_comments: boolean;
  // Frequency
  notification_frequency: string;
  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  // Digest settings
  digest_enabled: boolean;
  digest_time?: string | null;
  digest_timezone?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// Zod schemas
const CreateNotificationSchema = z.object({
  reminder_id: z.string().uuid().optional().nullable(),
  goal_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid(),
  type: z.enum(['due', 'overdue', 'assigned', 'unassigned', 'mentioned', 'commented', 'completed', 'snoozed', 'goal_checkin_due', 'goal_checkin_overdue']),
  channel: z.enum(['in_app', 'email', 'push']),
  title: z.string().optional(),
  message: z.string().optional(),
}).refine(data => data.reminder_id || data.goal_id, {
  message: "Either reminder_id or goal_id must be provided",
});

const UpdatePreferencesSchema = z.object({
  // Email preferences — matching user_notification_preferences DB schema
  email_enabled: z.boolean().optional(),
  email_due_reminders: z.boolean().optional(),
  email_assignments: z.boolean().optional(),
  email_mentions: z.boolean().optional(),
  email_comments: z.boolean().optional(),
  // In-app preferences
  in_app_enabled: z.boolean().optional(),
  in_app_due_reminders: z.boolean().optional(),
  in_app_assignments: z.boolean().optional(),
  in_app_mentions: z.boolean().optional(),
  in_app_comments: z.boolean().optional(),
  // Frequency
  notification_frequency: z.enum(['instant', 'hourly', 'daily']).optional(),
  // Quiet hours
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
  // Digest settings
  digest_enabled: z.boolean().optional(),
  digest_time: z.string().nullable().optional(),
  digest_timezone: z.string().optional(),
  timezone: z.string().optional(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

// =============================================
// SERVICE
// =============================================

/** Service for reminder notification preferences, quiet hours, and digest frequency management. */
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
      logger.error('Error checking quiet hours:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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

    let spaceId: string;
    let entityTitle: string;
    let entityEmoji: string | undefined;

    if (validated.reminder_id) {
      // Get reminder details to fetch space_id
      const { data: reminder, error: reminderError } = await supabase
        .from('reminders')
        .select('space_id, title, emoji')
        .eq('id', validated.reminder_id)
        .single();

      if (reminderError || !reminder) {
        logger.error('Reminder not found:', reminderError, { component: 'lib-reminder-notifications-service', action: 'service_call' });
        return null;
      }

      spaceId = reminder.space_id;
      entityTitle = reminder.title;
      entityEmoji = reminder.emoji;
    } else if (validated.goal_id) {
      // Get goal details to fetch space_id
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('space_id, title, description')
        .eq('id', validated.goal_id)
        .single();

      if (goalError || !goal) {
        logger.error('Goal not found:', goalError, { component: 'lib-reminder-notifications-service', action: 'service_call' });
        return null;
      }

      spaceId = goal.space_id;
      entityTitle = goal.title;
      entityEmoji = '🎯'; // Default emoji for goals
    } else {
      logger.error('Neither reminder_id nor goal_id provided', undefined, { component: 'lib-reminder-notifications-service', action: 'service_call' });
      return null;
    }

    // Get user preferences
    const prefs = await this.getPreferences(validated.user_id);

    if (!prefs) {
      logger.info('No preferences found for user, using defaults', { component: 'lib-reminder-notifications-service' });
    }

    // Check if user should receive this notification
    const { data: shouldSend } = await supabase.rpc('should_send_notification', {
      p_user_id: validated.user_id,
      p_space_id: spaceId,
      p_notification_type: validated.type,
      p_channel: validated.channel,
    });

    if (!shouldSend) {
      logger.info('Notification blocked by user preferences', { component: 'lib-reminder-notifications-service' });
      return null;
    }

    // Create in-app notification (always created for history)
    const { data, error } = await supabase
      .from('reminder_notifications')
      .insert({
        reminder_id: validated.reminder_id,
        goal_id: validated.goal_id,
        user_id: validated.user_id,
        type: validated.type,
        channel: validated.channel,
        title: validated.title,
        message: validated.message,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating notification:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
      throw new Error('Failed to create notification');
    }

    // Handle email and push notifications based on frequency and quiet hours
    if (prefs) {
      const digestFrequency = prefs.notification_frequency || 'realtime';
      const inQuietHours = await this.isInQuietHours(validated.user_id, spaceId);

      // Map digest frequency to notification frequency
      const frequency: NotificationFrequency = digestFrequency === 'realtime' ? 'instant' :
                                               digestFrequency === 'weekly' ? 'daily' :
                                               digestFrequency === 'daily' ? 'daily' :
                                               'instant'; // default to instant for any other value

      // Queue for batching if not instant, or if in quiet hours
      if (frequency !== 'instant' || inQuietHours) {
        await notificationQueueService.queueNotification(
          validated.user_id,
          spaceId,
          validated.type,
          {
            reminder_id: validated.reminder_id,
            goal_id: validated.goal_id,
            title: entityTitle,
            emoji: entityEmoji,
            type: validated.type,
            channel: validated.channel,
          },
          frequency
        );
      } else {
        // Send immediately
        await this.sendImmediateNotification(validated, { title: entityTitle, emoji: entityEmoji });
      }
    } else {
      // No preferences, send immediately
      await this.sendImmediateNotification(validated, { title: entityTitle, emoji: entityEmoji });
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
    logger.info('Sending email notification:', { component: 'lib-reminder-notifications-service', data: {
      userId,
      type,
      reminder,
    } });
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

      const isServer = typeof window === 'undefined';
      const apiUrl = isServer
        ? `${getAppUrl()}/api/notifications/send-push`
        : '/api/notifications/send-push';
      const requestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          bodyText: body,
          icon: `/icons/${reminder.emoji || '🔔'}.png`,
          tag: `reminder-${type}`,
        }),
      };

      if (isServer) {
        await fetch(apiUrl, requestInit);
      } else {
        await csrfFetch(apiUrl, requestInit);
      }
    } catch (error) {
      logger.error('Error sending push notification:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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
      goal_checkin_due: 'Goal Check-In Due',
      goal_checkin_overdue: 'Goal Check-In Overdue',
    };

    return titleMap[type] || 'Notification';
  },

  /**
   * Format notification body
   */
  formatNotificationBody(type: NotificationType, entity: { title: string; emoji?: string }): string {
    const emoji = entity.emoji || (type.startsWith('goal_') ? '🎯' : '🔔');

    const bodyMap: Record<NotificationType, string> = {
      due: `${emoji} ${entity.title} is due now`,
      overdue: `${emoji} ${entity.title} is overdue`,
      assigned: `${emoji} You were assigned to ${entity.title}`,
      unassigned: `${emoji} You were unassigned from ${entity.title}`,
      mentioned: `${emoji} You were mentioned in ${entity.title}`,
      commented: `${emoji} New comment on ${entity.title}`,
      completed: `${emoji} ${entity.title} was completed`,
      snoozed: `${emoji} ${entity.title} was snoozed`,
      goal_checkin_due: `${emoji} Time to check in on "${entity.title}"`,
      goal_checkin_overdue: `${emoji} Overdue check-in for "${entity.title}"`,
    };

    return bodyMap[type] || `${emoji} Update on ${entity.title}`;
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
        ),
        goal:goal_id (
          id,
          title,
          description
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
      logger.error('Error fetching notifications:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Error fetching unread count:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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
      logger.error('Error marking notification as read:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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
      logger.error('Error marking all notifications as read:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
      throw new Error('Failed to mark all notifications as read');
    }
  },

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const supabase = createClient();

    // nosemgrep: supabase-missing-space-id-filter — user-scoped preferences, filtered by user_id
    const query = supabase
      .from('user_notification_preferences')
      .select('id, user_id, space_id, email_enabled, email_due_reminders, email_assignments, email_mentions, email_comments, in_app_enabled, in_app_due_reminders, in_app_assignments, in_app_mentions, in_app_comments, notification_frequency, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, digest_enabled, digest_time, digest_timezone, timezone, created_at, updated_at')
      .eq('user_id', userId);

    const { data, error } = await query.single();

    if (error) {
      // If no preferences found, return defaults
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Error fetching preferences:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
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
    const existing = await this.getPreferences(userId);

    if (existing) {
      // nosemgrep: supabase-missing-space-id-filter — update scoped by .eq('id', existing.id)
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
        logger.error('Error updating preferences:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
        throw new Error('Failed to update preferences');
      }

      return data;
    } else {
      // nosemgrep: supabase-missing-space-id-filter — space_id included in insert payload
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
        logger.error('Error creating preferences:', error, { component: 'lib-reminder-notifications-service', action: 'service_call' });
        throw new Error('Failed to create preferences');
      }

      return data;
    }
  },

  /**
   * Format notification message for display
   */
  formatNotificationMessage(notification: ReminderNotification): string {
    // Use custom title/message if provided, otherwise derive from entity
    if (notification.title || notification.message) {
      return notification.message || notification.title || 'Notification';
    }

    const isGoalNotification = notification.type.startsWith('goal_');
    const entityTitle = isGoalNotification
      ? (notification.goal?.title || 'A goal')
      : (notification.reminder?.title || 'A reminder');
    const emoji = isGoalNotification
      ? '🎯'
      : (notification.reminder?.emoji || '🔔');

    switch (notification.type) {
      case 'due':
        return `${emoji} ${entityTitle} is due now`;

      case 'overdue':
        return `${emoji} ${entityTitle} is overdue`;

      case 'assigned':
        return `${emoji} You were assigned to ${entityTitle}`;

      case 'unassigned':
        return `${emoji} You were unassigned from ${entityTitle}`;

      case 'mentioned':
        return `${emoji} You were mentioned in ${entityTitle}`;

      case 'commented':
        return `${emoji} New comment on ${entityTitle}`;

      case 'completed':
        return `${emoji} ${entityTitle} was completed`;

      case 'snoozed':
        return `${emoji} ${entityTitle} was snoozed`;

      case 'goal_checkin_due':
        return `${emoji} Time to check in on "${entityTitle}"`;

      case 'goal_checkin_overdue':
        return `${emoji} Overdue check-in for "${entityTitle}"`;

      default:
        return `${emoji} Update on ${entityTitle}`;
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
      goal_checkin_due: 'Target',
      goal_checkin_overdue: 'AlertTriangle',
    };

    return iconMap[type] || 'Bell';
  },

  /**
   * Get notification color for display
   */
  getNotificationColor(type: NotificationType): string {
    const colorMap: Record<NotificationType, string> = {
      due: 'text-blue-400',
      overdue: 'text-red-400',
      assigned: 'text-green-400',
      unassigned: 'text-gray-400',
      mentioned: 'text-purple-400',
      commented: 'text-pink-400',
      completed: 'text-green-400',
      snoozed: 'text-purple-400',
      goal_checkin_due: 'text-indigo-400',
      goal_checkin_overdue: 'text-red-400',
    };

    return colorMap[type] || 'text-gray-400';
  },
};
