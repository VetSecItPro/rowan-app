import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  space_id: string | null;
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
  push_enabled: boolean;
  push_due_reminders: boolean;
  push_assignments: boolean;
  push_mentions: boolean;
  push_comments: boolean;
  notification_frequency: 'instant' | 'hourly' | 'daily';
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

// digest_enabled / digest_time / digest_timezone / timezone were dropped
// when the Daily Digest feature was retired (2026-05-07). The cron, job,
// preview API, email templates, UI section, and physical columns are all
// gone. Migration 20260507044831 idempotently drops the columns from any
// environment where they still exist.
const PREFERENCE_COLUMNS = 'id, user_id, space_id, email_enabled, email_due_reminders, email_assignments, email_mentions, email_comments, in_app_enabled, in_app_due_reminders, in_app_assignments, in_app_mentions, in_app_comments, push_enabled, push_due_reminders, push_assignments, push_mentions, push_comments, notification_frequency, quiet_hours_enabled, quiet_hours_start, quiet_hours_end';

export const notificationPreferencesService = {
  /**
   * Get notification preferences for a user, optionally scoped by space.
   */
  async getPreferences(
    userId: string,
    spaceId?: string | null
  ): Promise<NotificationPreferencesRow | null> {
    const supabase = createClient();
    // nosemgrep: supabase-missing-space-id-filter — space_id filter applied conditionally below
    let query = supabase
      .from('user_notification_preferences')
      .select(PREFERENCE_COLUMNS)
      .eq('user_id', userId);

    if (spaceId) {
      query = query.eq('space_id', spaceId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error('[notification-preferences-service] getPreferences error:', error, {
        component: 'lib-notification-preferences-service',
        action: 'service_call',
      });
      throw error;
    }

    return data as NotificationPreferencesRow | null;
  },

  /**
   * Create default notification preferences for a user.
   */
  async createDefaults(
    userId: string,
    spaceId: string | null,
    defaults: Omit<NotificationPreferencesRow, 'id' | 'user_id' | 'space_id'>
  ): Promise<NotificationPreferencesRow> {
    const supabase = createClient();
    const newPrefs = {
      user_id: userId,
      space_id: spaceId,
      ...defaults,
    };

    // nosemgrep: supabase-missing-space-id-filter — space_id included in newPrefs object
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .insert(newPrefs)
      .select()
      .single();

    if (error) {
      logger.error('[notification-preferences-service] createDefaults error:', error, {
        component: 'lib-notification-preferences-service',
        action: 'service_call',
      });
      throw error;
    }

    return data as NotificationPreferencesRow;
  },

  /**
   * Update notification preferences by row ID.
   */
  async updatePreferences(
    preferencesId: string,
    updates: Partial<Omit<NotificationPreferencesRow, 'id' | 'user_id' | 'space_id'>>
  ): Promise<void> {
    const supabase = createClient();
    // nosemgrep: supabase-missing-space-id-filter — update scoped by .eq('id', preferencesId)
    const { error } = await supabase
      .from('user_notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', preferencesId);

    if (error) {
      logger.error('[notification-preferences-service] updatePreferences error:', error, {
        component: 'lib-notification-preferences-service',
        action: 'service_call',
      });
      throw error;
    }
  },
};
