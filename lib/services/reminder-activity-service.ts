import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// =============================================
// TYPES & VALIDATION
// =============================================

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'uncompleted'
  | 'snoozed'
  | 'unsnoozed'
  | 'assigned'
  | 'unassigned'
  | 'deleted'
  | 'commented'
  | 'status_changed'
  | 'priority_changed'
  | 'category_changed';

export interface ReminderActivity {
  id: string;
  reminder_id: string;
  user_id: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// Zod schema for activity validation
const ActivityMetadataSchema = z.record(z.string(), z.any()).optional();

const CreateActivitySchema = z.object({
  reminder_id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum([
    'created',
    'updated',
    'completed',
    'uncompleted',
    'snoozed',
    'unsnoozed',
    'assigned',
    'unassigned',
    'deleted',
    'commented',
    'status_changed',
    'priority_changed',
    'category_changed',
  ]),
  metadata: ActivityMetadataSchema,
});

export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;

// =============================================
// SERVICE
// =============================================

export const reminderActivityService = {
  /**
   * Log an activity for a reminder
   * Security: Validates user has access to the reminder's space
   */
  async logActivity(input: CreateActivityInput): Promise<ReminderActivity> {
    const supabase = createClient();

    // Validate input
    const validated = CreateActivitySchema.parse(input);

    // Security: Verify user has access to this reminder's space
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('space_id')
      .eq('id', validated.reminder_id)
      .single();

    if (reminderError || !reminder) {
      throw new Error('Reminder not found or access denied');
    }

    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('id')
      .eq('space_id', reminder.space_id)
      .eq('user_id', validated.user_id)
      .single();

    if (memberError || !membership) {
      throw new Error('User is not a member of this space');
    }

    // Insert activity log
    const { data, error } = await supabase
      .from('reminder_activities')
      .insert({
        reminder_id: validated.reminder_id,
        user_id: validated.user_id,
        action: validated.action,
        metadata: validated.metadata || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error logging activity:', error, { component: 'lib-reminder-activity-service', action: 'service_call' });
      throw new Error('Failed to log activity');
    }

    return data;
  },

  /**
   * Get activity log for a reminder
   * Returns activities with user information
   */
  async getActivityLog(
    reminderId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ReminderActivity[]> {
    const supabase = createClient();
    const { limit = 50, offset = 0 } = options || {};

    // Security: RLS will enforce space membership
    let query = supabase
      .from('reminder_activities')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('reminder_id', reminderId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching activity log:', error, { component: 'lib-reminder-activity-service', action: 'service_call' });
      throw new Error('Failed to fetch activity log');
    }

    return data || [];
  },

  /**
   * Get recent activity across all reminders in a space
   * Useful for activity feeds and dashboards
   */
  async getRecentActivityForSpace(
    spaceId: string,
    options?: { limit?: number }
  ): Promise<ReminderActivity[]> {
    const supabase = createClient();
    const { limit = 20 } = options || {};

    // First, get reminder IDs for this space
    const { data: reminderIds, error: reminderError } = await supabase
      .from('reminders')
      .select('id')
      .eq('space_id', spaceId);

    if (reminderError) {
      logger.error('Error fetching reminder IDs:', reminderError, { component: 'lib-reminder-activity-service', action: 'service_call' });
      throw new Error('Failed to fetch reminder IDs');
    }

    const ids = reminderIds?.map((r: { id: string }) => r.id) || [];

    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('reminder_activity')
      .select(`
        *,
        user:user_id (
          id,
          name,
          email,
          avatar_url
        ),
        reminder:reminder_id (
          id,
          title,
          emoji
        )
      `)
      .in('reminder_id', ids)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching space activity:', error, { component: 'lib-reminder-activity-service', action: 'service_call' });
      throw new Error('Failed to fetch space activity');
    }

    return data || [];
  },

  /**
   * Format activity message for display
   * Converts action type and metadata into human-readable message
   */
  formatActivityMessage(activity: ReminderActivity): string {
    const userName = activity.user?.name || 'Someone';

    switch (activity.action) {
      case 'created':
        return `${userName} created this reminder`;

      case 'completed':
        return `${userName} completed this reminder`;

      case 'uncompleted':
        return `${userName} marked this as incomplete`;

      case 'snoozed':
        if (activity.metadata?.snooze_until) {
          const snoozeDate = new Date(activity.metadata.snooze_until);
          return `${userName} snoozed until ${snoozeDate.toLocaleString()}`;
        }
        return `${userName} snoozed this reminder`;

      case 'unsnoozed':
        return `${userName} unsnoozed this reminder`;

      case 'assigned':
        return `${userName} assigned this reminder`;

      case 'unassigned':
        return `${userName} unassigned this reminder`;

      case 'status_changed':
        if (activity.metadata?.old_status && activity.metadata?.new_status) {
          return `${userName} changed status from ${activity.metadata.old_status} to ${activity.metadata.new_status}`;
        }
        return `${userName} changed the status`;

      case 'priority_changed':
        if (activity.metadata?.old_priority && activity.metadata?.new_priority) {
          return `${userName} changed priority from ${activity.metadata.old_priority} to ${activity.metadata.new_priority}`;
        }
        return `${userName} changed the priority`;

      case 'category_changed':
        if (activity.metadata?.old_category && activity.metadata?.new_category) {
          return `${userName} changed category from ${activity.metadata.old_category} to ${activity.metadata.new_category}`;
        }
        return `${userName} changed the category`;

      case 'commented':
        return `${userName} added a comment`;

      case 'updated':
        return `${userName} updated this reminder`;

      case 'deleted':
        return `${userName} deleted this reminder`;

      default:
        return `${userName} made a change`;
    }
  },

  /**
   * Get activity icon for display
   * Returns Lucide icon name for each action type
   */
  getActivityIcon(action: ActivityAction): string {
    const iconMap: Record<ActivityAction, string> = {
      created: 'Plus',
      updated: 'Edit',
      completed: 'CheckCircle',
      uncompleted: 'Circle',
      snoozed: 'Clock',
      unsnoozed: 'Bell',
      assigned: 'UserCheck',
      unassigned: 'UserX',
      deleted: 'Trash2',
      commented: 'MessageSquare',
      status_changed: 'RefreshCw',
      priority_changed: 'Flag',
      category_changed: 'Tag',
    };

    return iconMap[action] || 'Activity';
  },

  /**
   * Get activity color for display
   * Returns Tailwind color class for each action type
   */
  getActivityColor(action: ActivityAction): string {
    const colorMap: Record<ActivityAction, string> = {
      created: 'text-green-400',
      updated: 'text-blue-400',
      completed: 'text-green-400',
      uncompleted: 'text-gray-400',
      snoozed: 'text-purple-400',
      unsnoozed: 'text-blue-400',
      assigned: 'text-indigo-400',
      unassigned: 'text-gray-400',
      deleted: 'text-red-400',
      commented: 'text-pink-400',
      status_changed: 'text-blue-400',
      priority_changed: 'text-orange-400',
      category_changed: 'text-purple-400',
    };

    return colorMap[action] || 'text-gray-400';
  },
};
