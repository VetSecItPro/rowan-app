import { createClient } from '@/lib/supabase/client';
import { emailService } from './email-service';
import { pushService } from './push-service';

export interface DigestNotification {
  id: string;
  type: 'task' | 'event' | 'message' | 'goal' | 'shopping' | 'expense' | 'reminder';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  space_id: string;
  space_name: string;
  url: string;
  created_at: string;
  user_id: string;
  metadata: Record<string, any>;
}

export interface DigestPreferences {
  user_id: string;
  space_id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'immediate';
  time_preference: string; // HH:mm format
  day_of_week?: number; // 0-6 for weekly digests
  email_enabled: boolean;
  push_enabled: boolean;
  include_types: string[];
  minimum_items: number;
}

export interface DigestSummary {
  total_notifications: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  spaces_affected: string[];
  date_range: {
    start: string;
    end: string;
  };
}

class DigestService {
  private supabase = createClient();

  /**
   * Create a digest for a user and space
   */
  async createDigest(
    userId: string,
    spaceId: string,
    frequency: 'daily' | 'weekly'
  ): Promise<{ notifications: DigestNotification[]; summary: DigestSummary } | null> {
    try {
      // Get user's digest preferences
      const preferences = await this.getUserDigestPreferences(userId, spaceId);
      if (!preferences || !preferences.enabled) {
        return null;
      }

      // Calculate date range
      const dateRange = this.getDateRange(frequency);

      // Get undigested notifications
      const notifications = await this.getUndigestedNotifications(
        userId,
        spaceId,
        dateRange.start,
        dateRange.end,
        preferences.include_types
      );

      // Check minimum items threshold
      if (notifications.length < preferences.minimum_items) {
        return null;
      }

      // Create summary
      const summary = this.createSummary(notifications, dateRange);

      // Mark notifications as digested
      await this.markNotificationsAsDigested(notifications.map(n => n.id));

      return { notifications, summary };
    } catch (error) {
      console.error('Error creating digest:', error);
      return null;
    }
  }

  /**
   * Send digest to user via email and/or push
   */
  async sendDigest(
    userId: string,
    spaceId: string,
    frequency: 'daily' | 'weekly'
  ): Promise<{ email: boolean; push: boolean }> {
    const results = { email: false, push: false };

    try {
      const digestData = await this.createDigest(userId, spaceId, frequency);
      if (!digestData) {
        return results;
      }

      const { notifications, summary } = digestData;

      // Get user info
      const { data: user } = await this.supabase
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Get space info
      const { data: space } = await this.supabase
        .from('spaces')
        .select('name')
        .eq('id', spaceId)
        .single();

      const spaceName = space?.name || 'Your Space';

      // Get user preferences
      const preferences = await this.getUserDigestPreferences(userId, spaceId);
      if (!preferences) {
        return results;
      }

      // Send email digest
      if (preferences.email_enabled && user.email) {
        try {
          const emailResult = await emailService.sendDigestEmail(
            user.email,
            user.name || 'User',
            spaceName,
            notifications.map(n => ({
              type: n.type,
              title: n.title,
              description: n.content,
              url: n.url,
              timestamp: n.created_at,
            })),
            frequency
          );
          results.email = emailResult.success;
        } catch (error) {
          console.error('Error sending digest email:', error);
        }
      }

      // Send push digest
      if (preferences.push_enabled) {
        try {
          const pushResult = await pushService.sendNotification(userId, {
            title: `Your ${frequency} digest`,
            body: `${summary.total_notifications} notifications from ${spaceName}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `digest-${frequency}`,
            data: {
              url: '/notifications',
              action: 'digest',
              digest_id: `${userId}-${spaceId}-${Date.now()}`,
            },
          });
          results.push = pushResult.success;
        } catch (error) {
          console.error('Error sending digest push:', error);
        }
      }

      // Log digest activity
      await this.logDigestActivity(userId, spaceId, frequency, summary.total_notifications);

      return results;
    } catch (error) {
      console.error('Error sending digest:', error);
      return results;
    }
  }

  /**
   * Process all pending digests (called by cron job)
   */
  async processAllDigests(): Promise<{
    daily: { processed: number; sent: number };
    weekly: { processed: number; sent: number };
  }> {
    const results = {
      daily: { processed: 0, sent: 0 },
      weekly: { processed: 0, sent: 0 },
    };

    try {
      // Get all active digest preferences
      const { data: preferences } = await this.supabase
        .from('digest_preferences')
        .select('*')
        .eq('enabled', true);

      if (!preferences) {
        return results;
      }

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDayOfWeek = now.getDay();

      for (const pref of preferences) {
        // Check if it's time to send digest
        const shouldSendDaily = pref.frequency === 'daily' &&
          this.isTimeToSend(currentTime, pref.time_preference);

        const shouldSendWeekly = pref.frequency === 'weekly' &&
          pref.day_of_week === currentDayOfWeek &&
          this.isTimeToSend(currentTime, pref.time_preference);

        if (shouldSendDaily) {
          results.daily.processed++;
          const sent = await this.sendDigest(pref.user_id, pref.space_id, 'daily');
          if (sent.email || sent.push) {
            results.daily.sent++;
          }
        }

        if (shouldSendWeekly) {
          results.weekly.processed++;
          const sent = await this.sendDigest(pref.user_id, pref.space_id, 'weekly');
          if (sent.email || sent.push) {
            results.weekly.sent++;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing digests:', error);
      return results;
    }
  }

  /**
   * Get user's digest preferences
   */
  async getUserDigestPreferences(userId: string, spaceId: string): Promise<DigestPreferences | null> {
    const { data, error } = await this.supabase
      .from('digest_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting digest preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Update user's digest preferences
   */
  async updateDigestPreferences(
    userId: string,
    spaceId: string,
    preferences: Partial<Omit<DigestPreferences, 'user_id' | 'space_id'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('digest_preferences')
        .upsert({
          user_id: userId,
          space_id: spaceId,
          ...preferences,
        });

      if (error) {
        console.error('Error updating digest preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating digest preferences:', error);
      return false;
    }
  }

  /**
   * Get digest analytics for a space
   */
  async getDigestAnalytics(spaceId: string, days: number = 30): Promise<{
    total_digests_sent: number;
    email_digests_sent: number;
    push_digests_sent: number;
    daily_digests: number;
    weekly_digests: number;
    average_notifications_per_digest: number;
    user_engagement: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: activities } = await this.supabase
        .from('digest_activities')
        .select('*')
        .eq('space_id', spaceId)
        .gte('created_at', startDate.toISOString());

      if (!activities) {
        return {
          total_digests_sent: 0,
          email_digests_sent: 0,
          push_digests_sent: 0,
          daily_digests: 0,
          weekly_digests: 0,
          average_notifications_per_digest: 0,
          user_engagement: 0,
        };
      }

      const totalDigests = activities.length;
      const dailyDigests = activities.filter(a => a.frequency === 'daily').length;
      const weeklyDigests = activities.filter(a => a.frequency === 'weekly').length;
      const totalNotifications = activities.reduce((sum, a) => sum + a.notification_count, 0);

      // Get user count for engagement calculation
      const { count: userCount } = await this.supabase
        .from('space_members')
        .select('*', { count: 'exact' })
        .eq('space_id', spaceId);

      return {
        total_digests_sent: totalDigests,
        email_digests_sent: totalDigests, // Assuming all are email for now
        push_digests_sent: totalDigests, // Assuming all are push for now
        daily_digests: dailyDigests,
        weekly_digests: weeklyDigests,
        average_notifications_per_digest: totalDigests > 0 ? totalNotifications / totalDigests : 0,
        user_engagement: userCount ? (totalDigests / (userCount * days)) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting digest analytics:', error);
      return {
        total_digests_sent: 0,
        email_digests_sent: 0,
        push_digests_sent: 0,
        daily_digests: 0,
        weekly_digests: 0,
        average_notifications_per_digest: 0,
        user_engagement: 0,
      };
    }
  }

  // Private helper methods

  private getDateRange(frequency: 'daily' | 'weekly'): { start: string; end: string } {
    const end = new Date();
    const start = new Date();

    if (frequency === 'daily') {
      start.setDate(start.getDate() - 1);
    } else {
      start.setDate(start.getDate() - 7);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  private async getUndigestedNotifications(
    userId: string,
    spaceId: string,
    startDate: string,
    endDate: string,
    includeTypes: string[]
  ): Promise<DigestNotification[]> {
    let query = this.supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        content,
        priority,
        space_id,
        url,
        created_at,
        user_id,
        metadata,
        spaces(name)
      `)
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('is_digested', false)
      .order('created_at', { ascending: false });

    if (includeTypes.length > 0) {
      query = query.in('type', includeTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting undigested notifications:', error);
      return [];
    }

    return data?.map(notification => ({
      ...notification,
      space_name: notification.spaces?.name || 'Unknown Space',
    })) || [];
  }

  private async markNotificationsAsDigested(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const { error } = await this.supabase
      .from('notifications')
      .update({ is_digested: true })
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as digested:', error);
    }
  }

  private createSummary(notifications: DigestNotification[], dateRange: { start: string; end: string }): DigestSummary {
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const spacesAffected = new Set<string>();

    notifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
      spacesAffected.add(notification.space_name);
    });

    return {
      total_notifications: notifications.length,
      by_type: byType,
      by_priority: byPriority,
      spaces_affected: Array.from(spacesAffected),
      date_range: dateRange,
    };
  }

  private async logDigestActivity(
    userId: string,
    spaceId: string,
    frequency: 'daily' | 'weekly',
    notificationCount: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('digest_activities')
      .insert([{
        user_id: userId,
        space_id: spaceId,
        frequency,
        notification_count: notificationCount,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('Error logging digest activity:', error);
    }
  }

  private isTimeToSend(currentTime: string, preferredTime: string): boolean {
    // Allow 5-minute window for sending
    const current = this.timeToMinutes(currentTime);
    const preferred = this.timeToMinutes(preferredTime);
    return Math.abs(current - preferred) <= 5;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Initialize default digest preferences for a new user
   */
  async initializeUserDigestPreferences(userId: string, spaceId: string): Promise<void> {
    const defaultPreferences: Omit<DigestPreferences, 'user_id' | 'space_id'> = {
      enabled: true,
      frequency: 'daily',
      time_preference: '09:00',
      email_enabled: true,
      push_enabled: true,
      include_types: ['task', 'event', 'message', 'goal', 'reminder'],
      minimum_items: 3,
    };

    await this.updateDigestPreferences(userId, spaceId, defaultPreferences);
  }

  /**
   * Bulk process immediate notifications (real-time batching)
   */
  async processImmediateNotifications(spaceId: string): Promise<void> {
    // Get users with immediate digest preference
    const { data: immediateUsers } = await this.supabase
      .from('digest_preferences')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('frequency', 'immediate')
      .eq('enabled', true);

    if (!immediateUsers || immediateUsers.length === 0) {
      return;
    }

    // Process each user's immediate notifications
    for (const user of immediateUsers) {
      const notifications = await this.getUndigestedNotifications(
        user.user_id,
        spaceId,
        new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Last 5 minutes
        new Date().toISOString(),
        ['task', 'event', 'message', 'goal', 'reminder']
      );

      if (notifications.length > 0) {
        // Send as individual notifications rather than digest
        for (const notification of notifications) {
          await pushService.sendNotification(user.user_id, {
            title: notification.title,
            body: notification.content,
            icon: '/icon-192x192.png',
            data: {
              url: notification.url,
              type: notification.type,
              id: notification.id,
            },
          });
        }

        // Mark as digested
        await this.markNotificationsAsDigested(notifications.map(n => n.id));
      }
    }
  }
}

// Export singleton instance
export const digestService = new DigestService();

// Export types
export type {
  DigestNotification,
  DigestPreferences,
  DigestSummary,
};