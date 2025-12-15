import { createClient } from '@/lib/supabase/client';
import { NotificationFrequency } from './reminder-notifications-service';
import { logger } from '@/lib/logger';

export interface QueuedNotification {
  id: string;
  user_id: string;
  space_id?: string;
  notification_type: string;
  notification_data: Record<string, unknown>;
  delivery_method: 'instant' | 'hourly' | 'daily';
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  suppressed_by_quiet_hours: boolean;
  original_scheduled_for?: string;
  created_at: string;
  updated_at: string;
}

export const notificationQueueService = {
  /**
   * Queue a notification for delivery
   */
  async queueNotification(
    userId: string,
    spaceId: string | null,
    notificationType: string,
    notificationData: Record<string, unknown>,
    frequency: NotificationFrequency = 'instant'
  ): Promise<QueuedNotification> {
    const supabase = createClient();

    // Calculate scheduled time based on frequency
    const scheduledFor = await this.calculateScheduledTime(userId, spaceId, frequency);

    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        space_id: spaceId,
        notification_type: notificationType,
        notification_data: notificationData,
        delivery_method: frequency,
        scheduled_for: scheduledFor,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error queueing notification:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to queue notification');
    }

    return data;
  },

  /**
   * Calculate scheduled time based on frequency and quiet hours
   */
  async calculateScheduledTime(
    userId: string,
    spaceId: string | null,
    frequency: NotificationFrequency
  ): Promise<string> {
    const supabase = createClient();

    // Get current time
    const now = new Date();

    // Calculate base scheduled time using database function
    const { data: baseTime, error: timeError } = await supabase.rpc(
      'calculate_next_delivery_time',
      {
        p_frequency: frequency,
        p_base_time: now.toISOString(),
      }
    );

    if (timeError) {
      logger.error('Error calculating delivery time:', timeError, { component: 'lib-notification-queue-service', action: 'service_call' });
      return now.toISOString();
    }

    // Adjust for quiet hours
    const { data: adjustedTime, error: adjustError } = await supabase.rpc(
      'adjust_for_quiet_hours',
      {
        p_user_id: userId,
        p_space_id: spaceId,
        p_scheduled_time: baseTime || now.toISOString(),
      }
    );

    if (adjustError) {
      logger.error('Error adjusting for quiet hours:', adjustError, { component: 'lib-notification-queue-service', action: 'service_call' });
      return baseTime || now.toISOString();
    }

    return adjustedTime || baseTime || now.toISOString();
  },

  /**
   * Get pending notifications ready to send
   */
  async getPendingNotifications(limit: number = 100): Promise<QueuedNotification[]> {
    const supabase = createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching pending notifications:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to fetch pending notifications');
    }

    return data || [];
  },


  /**
   * Mark notification as sent
   */
  async markAsSent(notificationIds: string[]): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .in('id', notificationIds);

    if (error) {
      logger.error('Error marking notifications as sent:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to mark notifications as sent');
    }
  },

  /**
   * Mark notification as failed
   */
  async markAsFailed(
    notificationId: string,
    failureReason: string,
    retryCount: number
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: failureReason,
        retry_count: retryCount,
      })
      .eq('id', notificationId);

    if (error) {
      logger.error('Error marking notification as failed:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to mark notification as failed');
    }
  },

  /**
   * Retry failed notification
   */
  async retryNotification(notificationId: string): Promise<void> {
    const supabase = createClient();

    // Get current retry count
    const { data: notification, error: fetchError } = await supabase
      .from('notification_queue')
      .select('retry_count')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      throw new Error('Notification not found');
    }

    // Max 3 retries
    if (notification.retry_count >= 3) {
      throw new Error('Max retries exceeded');
    }

    // Reset to pending and increment retry count
    const { error } = await supabase
      .from('notification_queue')
      .update({
        status: 'pending',
        retry_count: notification.retry_count + 1,
        failed_at: null,
        failure_reason: null,
      })
      .eq('id', notificationId);

    if (error) {
      logger.error('Error retrying notification:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to retry notification');
    }
  },

  /**
   * Cancel pending notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('notification_queue')
      .update({ status: 'cancelled' })
      .eq('id', notificationId);

    if (error) {
      logger.error('Error cancelling notification:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      throw new Error('Failed to cancel notification');
    }
  },

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanup(): Promise<number> {
    const supabase = createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('notification_queue')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      logger.error('Error cleaning up notifications:', error, { component: 'lib-notification-queue-service', action: 'service_call' });
      return 0;
    }

    return data?.length || 0;
  },
};
