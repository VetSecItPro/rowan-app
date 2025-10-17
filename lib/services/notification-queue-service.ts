import { createClient } from '@/lib/supabase/client';
import { NotificationFrequency } from './reminder-notifications-service';

export interface QueuedNotification {
  id: string;
  user_id: string;
  space_id?: string;
  notification_type: string;
  notification_data: any;
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
    notificationData: any,
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
      console.error('Error queueing notification:', error);
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
      console.error('Error calculating delivery time:', timeError);
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
      console.error('Error adjusting for quiet hours:', adjustError);
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
      console.error('Error fetching pending notifications:', error);
      throw new Error('Failed to fetch pending notifications');
    }

    return data || [];
  },

  /**
   * Get notifications for hourly digest
   */
  async getHourlyDigest(userId: string, spaceId?: string): Promise<QueuedNotification[]> {
    const supabase = createClient();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('delivery_method', 'hourly')
      .eq('status', 'pending')
      .gte('created_at', oneHourAgo.toISOString())
      .lte('scheduled_for', now.toISOString());

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching hourly digest:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get notifications for daily digest
   */
  async getDailyDigest(userId: string, spaceId?: string): Promise<QueuedNotification[]> {
    const supabase = createClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('delivery_method', 'daily')
      .eq('status', 'pending')
      .gte('created_at', oneDayAgo.toISOString())
      .lte('scheduled_for', now.toISOString());

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching daily digest:', error);
      return [];
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
      console.error('Error marking notifications as sent:', error);
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
      console.error('Error marking notification as failed:', error);
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
      console.error('Error retrying notification:', error);
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
      console.error('Error cancelling notification:', error);
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
      console.error('Error cleaning up notifications:', error);
      return 0;
    }

    return data?.length || 0;
  },
};
