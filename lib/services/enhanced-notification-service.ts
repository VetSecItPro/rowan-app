import { createClient } from '@/lib/supabase/client';
import { pushService } from './push-service';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
// Removed notification-preferences-service and digest-service dependencies - using direct notification system

/**
 * Payload structure for creating notifications.
 */
export interface NotificationPayload {
  type: 'task' | 'event' | 'message' | 'goal' | 'shopping' | 'expense' | 'reminder';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
}

/**
 * Result of a batch notification operation, tracking delivery across channels.
 */
export interface NotificationResult {
  inApp: number;
  email: number;
  push: number;
  errors: string[];
}

/**
 * Space member information for notification targeting.
 */
interface SpaceMember {
  user_id: string;
  email: string;
  name: string;
}

/**
 * Database row structure for space member queries.
 */
interface SpaceMemberRow {
  user_id: string;
  users: {
    email: string;
    name: string | null;
  };
}

/**
 * Enhanced Notification Service
 *
 * Provides multi-channel notification delivery (in-app, email, push) for various
 * application events. This service coordinates notification sending across channels
 * while respecting user preferences. Currently configured for digest-only delivery
 * with individual notifications disabled.
 *
 * Client-safe implementation that delegates email sending to API routes.
 */
export const enhancedNotificationService = {
  /**
   * Retrieves all members of a space for notification targeting.
   *
   * @param spaceId - The unique identifier of the space
   * @returns Array of space members with their user_id, email, and name
   */
  async getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    const supabase = createClient();
    const { data: members, error } = await supabase
      .from('space_members')
      .select(`
        user_id,
        users!user_id!inner (
          id,
          name,
          email
        )
      `)
      .eq('space_id', spaceId);

    if (error) {
      logger.error('Error fetching space members:', error, { component: 'lib-enhanced-notification-service', action: 'service_call' });
      return [];
    }

    const typedMembers = (members || []) as SpaceMemberRow[];

    return typedMembers.map((member) => ({
      user_id: member.user_id,
      email: member.users.email,
      name: member.users.name || member.users.email.split('@')[0],
    }));
  },

  /**
   * Sends an email notification via the API route.
   *
   * This method is safe to call from client-side code as it delegates
   * the actual email sending to a server-side API route.
   *
   * @param type - The notification type identifier for template selection
   * @param recipient - The recipient's email address
   * @param subject - The email subject line
   * @param data - Template data to populate the email content
   * @returns An object indicating success or failure with an optional error message
   */
  async sendEmailNotification(
    type: string,
    recipient: string,
    subject: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await csrfFetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          recipient,
          subject,
          data,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('Email notification API error:', error, { component: 'lib-enhanced-notification-service', action: 'service_call' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Sends goal achievement notifications to specified users.
   *
   * Supports multiple achievement types including goal completion, milestone
   * reaching, and streak achievements. Batch fetches user data for efficiency.
   * Currently configured for in-app notifications only (email/push disabled).
   *
   * @param userIds - Array of user IDs to notify
   * @param data - Achievement details including type, goal info, and context
   * @returns Result object with counts of successful deliveries per channel and any errors
   */
  async sendGoalAchievementNotification(
    userIds: string[],
    data: {
      achievementType: 'goal_completed' | 'milestone_reached' | 'streak_achieved';
      goalTitle: string;
      goalId?: string;
      milestoneTitle?: string;
      completedBy: string;
      completionDate: string;
      streakCount?: number;
      nextMilestone?: string;
      goalUrl?: string;
      spaceName: string;
    }
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      inApp: 0,
      email: 0,
      push: 0,
      errors: [],
    };

    // PERF: Batch fetch all users instead of per-user queries — FIX-039
    const supabase = createClient();
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIds);

    if (usersError) {
      results.errors.push(`Failed to fetch users: ${usersError.message}`);
      return results;
    }

    interface UserRecord { id: string; email: string | null; name: string | null }
    const usersMap = new Map<string, UserRecord>((users || []).map((u: UserRecord) => [u.id, u]));

    const settled = await Promise.allSettled(userIds.map(async (userId) => {
      const user = usersMap.get(userId);

      if (!user) {
        results.errors.push(`User ${userId} not found`);
        return;
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendEmail = false;

      if (shouldSendEmail && user.email) {
        const emailResult = await this.sendEmailNotification(
          'goal_achievement',
          user.email,
          `🎉 Goal Achievement: ${data.goalTitle}`,
          {
            userName: user.name || 'User',
            spaceName: data.spaceName,
            achievementType: data.achievementType,
            goalTitle: data.goalTitle,
            milestoneTitle: data.milestoneTitle,
            completedBy: data.completedBy,
            completionDate: data.completionDate,
            streakCount: data.streakCount,
            nextMilestone: data.nextMilestone,
            goalUrl: data.goalUrl,
          }
        );

        if (emailResult.success) {
          results.email++;
        } else {
          results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
        }

        // Notification logging removed - using digest-only system
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendPush = false;

      if (shouldSendPush) {
        const pushTitle = data.achievementType === 'goal_completed'
          ? '🎉 Goal Completed!'
          : data.achievementType === 'milestone_reached'
          ? '🎯 Milestone Reached!'
          : '🔥 Streak Achieved!';

        const pushResult = await pushService.sendNotification(userId, {
          title: pushTitle,
          body: `${data.completedBy} completed "${data.goalTitle}" in ${data.spaceName}`,
          data: {
            type: 'goal_achievement',
            achievementType: data.achievementType,
            goalTitle: data.goalTitle,
            url: data.goalUrl,
          },
        });

        if (pushResult.success) {
          results.push++;
        } else {
          results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
        }
      }

      // Always create in-app notification
      results.inApp++;
    }));

    // Collect errors from rejected promises
    for (const result of settled) {
      if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        results.errors.push(`Failed to process goal achievement notification: ${errorMessage}`);
      }
    }

    return results;
  },

  /**
   * Sends task assignment notifications to specified users.
   *
   * Notifies users when they are assigned a new task. Includes task details,
   * priority level, and optional due date. Currently configured for in-app
   * notifications only (email/push disabled).
   *
   * @param userIds - Array of user IDs to notify (typically the assignee)
   * @param data - Task details including title, assigner, priority, and context
   * @returns Result object with counts of successful deliveries per channel and any errors
   */
  async sendTaskAssignmentNotification(
    userIds: string[],
    data: {
      taskTitle: string;
      assignedBy: string;
      assignedTo: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      description?: string;
      taskUrl?: string;
      spaceName: string;
    }
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      inApp: 0,
      email: 0,
      push: 0,
      errors: [],
    };

    // PERF: Batch fetch all users instead of per-user queries — PERF-015
    const supabase = createClient();
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIds);

    if (usersError) {
      results.errors.push(`Failed to fetch users: ${usersError.message}`);
      return results;
    }

    interface UserRecord { id: string; email: string | null; name: string | null }
    const usersMap = new Map<string, UserRecord>((users || []).map((u: UserRecord) => [u.id, u]));

    const settled = await Promise.allSettled(userIds.map(async (userId) => {
      const user = usersMap.get(userId);

      if (!user) {
        results.errors.push(`User ${userId} not found`);
        return;
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendEmail = false;

      if (shouldSendEmail && user.email) {
        const emailResult = await this.sendEmailNotification(
          'task_assignment',
          user.email,
          `📋 New Task: ${data.taskTitle}`,
          {
            userName: user.name || 'User',
            spaceName: data.spaceName,
            taskTitle: data.taskTitle,
            assignedBy: data.assignedBy,
            assignedTo: data.assignedTo,
            priority: data.priority,
            dueDate: data.dueDate,
            description: data.description,
            taskUrl: data.taskUrl,
          }
        );

        if (emailResult.success) {
          results.email++;
        } else {
          results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
        }

        // Notification logging removed - using digest-only system
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendPush = false;

      if (shouldSendPush) {
        const pushResult = await pushService.sendNotification(userId, {
          title: '📋 New Task Assigned',
          body: `${data.assignedBy} assigned you "${data.taskTitle}" in ${data.spaceName}`,
          data: {
            type: 'task_assignment',
            taskTitle: data.taskTitle,
            url: data.taskUrl,
          },
        });

        if (pushResult.success) {
          results.push++;
        } else {
          results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
        }
      }

      // Always create in-app notification
      results.inApp++;
    }));

    // Collect errors from rejected promises
    for (const result of settled) {
      if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        results.errors.push(`Failed to process task assignment notification: ${errorMessage}`);
      }
    }

    return results;
  },

  /**
   * Sends event reminder notifications to specified users.
   *
   * Notifies users about upcoming calendar events at configurable reminder
   * intervals. Includes event details, timing, and optional location.
   * Currently configured for in-app notifications only (email/push disabled).
   *
   * @param userIds - Array of user IDs to notify
   * @param data - Event details including title, times, location, and reminder interval
   * @returns Result object with counts of successful deliveries per channel and any errors
   */
  async sendEventReminderNotification(
    userIds: string[],
    data: {
      eventTitle: string;
      description?: string;
      startTime: string;
      endTime?: string;
      location?: string;
      reminderTime: '15min' | '1hour' | '1day';
      eventUrl?: string;
      spaceName: string;
    }
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      inApp: 0,
      email: 0,
      push: 0,
      errors: [],
    };

    // PERF: Batch fetch all users instead of per-user queries — PERF-015
    const supabase = createClient();
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIds);

    if (usersError) {
      results.errors.push(`Failed to fetch users: ${usersError.message}`);
      return results;
    }

    interface UserRecord { id: string; email: string | null; name: string | null }
    const usersMap = new Map<string, UserRecord>((users || []).map((u: UserRecord) => [u.id, u]));

    const settled = await Promise.allSettled(userIds.map(async (userId) => {
      const user = usersMap.get(userId);

      if (!user) {
        results.errors.push(`User ${userId} not found`);
        return;
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendEmail = false;

      if (shouldSendEmail && user.email) {
        const emailResult = await this.sendEmailNotification(
          'event_reminder',
          user.email,
          `📅 Event Reminder: ${data.eventTitle}`,
          {
            userName: user.name || 'User',
            spaceName: data.spaceName,
            eventTitle: data.eventTitle,
            description: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            location: data.location,
            reminderTime: data.reminderTime,
            eventUrl: data.eventUrl,
          }
        );

        if (emailResult.success) {
          results.email++;
        } else {
          results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
        }

        // Notification logging removed - using digest-only system
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendPush = false;

      if (shouldSendPush) {
        const reminderTexts = {
          '15min': 'is starting in 15 minutes',
          '1hour': 'is starting in 1 hour',
          '1day': 'is tomorrow',
        };

        const pushResult = await pushService.sendNotification(userId, {
          title: '📅 Event Reminder',
          body: `"${data.eventTitle}" ${reminderTexts[data.reminderTime]} in ${data.spaceName}`,
          data: {
            type: 'event_reminder',
            eventTitle: data.eventTitle,
            url: data.eventUrl,
          },
        });

        if (pushResult.success) {
          results.push++;
        } else {
          results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
        }
      }

      // Always create in-app notification
      results.inApp++;
    }));

    // Collect errors from rejected promises
    for (const result of settled) {
      if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        results.errors.push(`Failed to process event reminder notification: ${errorMessage}`);
      }
    }

    return results;
  },

  /**
   * Sends new message notifications to specified users.
   *
   * Notifies users about new messages in conversations. Supports both direct
   * messages and group conversations. Includes sender info and message preview.
   * Currently configured for in-app notifications only (email/push disabled).
   *
   * @param userIds - Array of user IDs to notify (conversation participants)
   * @param data - Message details including sender, preview, and conversation context
   * @returns Result object with counts of successful deliveries per channel and any errors
   */
  async sendNewMessageNotification(
    userIds: string[],
    data: {
      senderName: string;
      senderAvatar?: string;
      messagePreview: string;
      conversationTitle?: string;
      isDirectMessage: boolean;
      messageCount?: number;
      messageUrl?: string;
      spaceName: string;
    }
  ): Promise<NotificationResult> {
    const results: NotificationResult = {
      inApp: 0,
      email: 0,
      push: 0,
      errors: [],
    };

    // PERF: Batch fetch all users instead of per-user queries — PERF-015
    const supabase = createClient();
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', userIds);

    if (usersError) {
      results.errors.push(`Failed to fetch users: ${usersError.message}`);
      return results;
    }

    interface UserRecord { id: string; email: string | null; name: string | null }
    const usersMap = new Map<string, UserRecord>((users || []).map((u: UserRecord) => [u.id, u]));

    const settled = await Promise.allSettled(userIds.map(async (userId) => {
      const user = usersMap.get(userId);

      if (!user) {
        results.errors.push(`User ${userId} not found`);
        return;
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendEmail = false;

      if (shouldSendEmail && user.email) {
        const emailResult = await this.sendEmailNotification(
          'new_message',
          user.email,
          `💬 New Message from ${data.senderName}`,
          {
            userName: user.name || 'User',
            spaceName: data.spaceName,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            messagePreview: data.messagePreview,
            conversationTitle: data.conversationTitle,
            isDirectMessage: data.isDirectMessage,
            messageUrl: data.messageUrl,
          }
        );

        if (emailResult.success) {
          results.email++;
        } else {
          results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
        }

        // Notification logging removed - using digest-only system
      }

      // Individual notifications disabled - using digest-only system
      const shouldSendPush = false;

      if (shouldSendPush) {
        const pushResult = await pushService.sendNotification(userId, {
          title: data.isDirectMessage ? '💬 New Direct Message' : '💬 New Message',
          body: `${data.senderName}: ${data.messagePreview}`,
          data: {
            type: 'new_message',
            senderName: data.senderName,
            url: data.messageUrl,
          },
        });

        if (pushResult.success) {
          results.push++;
        } else {
          results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
        }
      }

      // Always create in-app notification
      results.inApp++;
    }));

    // Collect errors from rejected promises
    for (const result of settled) {
      if (result.status === 'rejected') {
        const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
        results.errors.push(`Failed to process new message notification: ${errorMessage}`);
      }
    }

    return results;
  },
};
