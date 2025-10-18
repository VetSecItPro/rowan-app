import { createClient } from '@/lib/supabase/client';

interface NotificationPreferences {
  user_id: string;
  email_reminders: boolean;
  email_tasks: boolean;
  email_shopping: boolean;
  email_meals: boolean;
  email_events: boolean;
  email_messages: boolean;
  push_reminders: boolean;
  push_tasks: boolean;
  push_shopping: boolean;
  push_meals: boolean;
  push_events: boolean;
  push_messages: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Client-safe notification preferences service
 * Contains only database operations that can be performed from client components
 */
export const notificationPreferencesService = {
  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data as NotificationPreferences;
  },

  /**
   * Check if current time is within user's quiet hours
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return false;

    const now = new Date();
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: prefs.timezone || 'UTC',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    const currentTime = userTime.replace(':', '');
    const quietStart = prefs.quiet_hours_start.replace(':', '');
    const quietEnd = prefs.quiet_hours_end.replace(':', '');

    // Handle overnight quiet hours (e.g., 22:00 to 06:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }

    return currentTime >= quietStart && currentTime <= quietEnd;
  },

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSendNotification(
    userId: string,
    category: 'reminder' | 'task' | 'shopping' | 'meal' | 'event' | 'message',
    type: 'email' | 'push'
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs) return false;

    // Check if in quiet hours
    if (await this.isInQuietHours(userId)) {
      return false;
    }

    // Check specific preference
    const prefKey = `${type}_${category}s` as keyof NotificationPreferences;
    return Boolean(prefs[prefKey]);
  },

  /**
   * Log notification to database
   */
  async logNotification(
    userId: string,
    type: 'email' | 'push',
    category: string,
    subject: string,
    status: 'sent' | 'failed' | 'bounced',
    errorMessage?: string
  ): Promise<void> {
    const supabase = createClient();
    await supabase.from('notification_log').insert({
      user_id: userId,
      type,
      category,
      subject,
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  },
};