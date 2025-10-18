import { createClient } from '@/lib/supabase/client';
import { emailService } from './email-service';
import { pushService } from './push-service';
import { digestService } from './digest-service';
import { notificationService } from './notification-service';

export interface NotificationPayload {
  type: 'task' | 'event' | 'message' | 'goal' | 'shopping' | 'expense' | 'reminder';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  space_id: string;
  url: string;
  metadata: Record<string, any>;
}

export interface GoalNotificationData {
  goalTitle: string;
  goalId: string;
  goalUrl: string;
  achievementType: 'goal_completed' | 'milestone_reached' | 'streak_milestone';
  completedBy: string;
  completionDate: string;
  spaceName: string;
  milestoneTitle?: string;
  streakCount?: number;
  nextMilestone?: string;
}

export interface TaskNotificationData {
  taskTitle: string;
  taskId: string;
  taskUrl: string;
  assignedBy: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  spaceName: string;
  description?: string;
}

export interface EventNotificationData {
  eventTitle: string;
  eventId: string;
  eventUrl: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isAllDay?: boolean;
  organizer: string;
  reminderType: 'now' | '15min' | '1hour' | '1day';
  spaceName: string;
  description?: string;
}

export interface MessageNotificationData {
  senderName: string;
  senderAvatar?: string;
  messagePreview: string;
  conversationTitle?: string;
  isDirectMessage: boolean;
  messageCount?: number;
  spaceName: string;
  messageUrl: string;
}

/**
 * Enhanced Notification Service
 * Integrates new React Email templates and push notifications with existing infrastructure
 */
export const enhancedNotificationService = {

  /**
   * Send goal achievement notifications
   */
  async sendGoalAchievementNotification(
    recipientIds: string[],
    data: GoalNotificationData
  ): Promise<{ email: number; push: number; errors: string[] }> {
    const results = { email: 0, push: 0, errors: [] as string[] };

    for (const userId of recipientIds) {
      try {
        // Get user info
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (!user) {
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        // Check preferences and send email
        const shouldSendEmail = await notificationService.shouldSendNotification(
          userId,
          'reminder', // Using reminder as closest category for goals
          'email'
        );

        if (shouldSendEmail && user.email) {
          const emailResult = await emailService.sendGoalAchievementEmail(
            user.email,
            user.name || 'User',
            data.spaceName,
            {
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

          // Log notification
          await notificationService.logNotification(
            userId,
            'email',
            'goal_achievement',
            `Goal achievement: ${data.goalTitle}`,
            emailResult.success ? 'sent' : 'failed',
            emailResult.error
          );
        }

        // Check preferences and send push
        const shouldSendPush = await notificationService.shouldSendNotification(
          userId,
          'reminder',
          'push'
        );

        if (shouldSendPush) {
          const pushTitle = data.achievementType === 'goal_completed'
            ? '🎉 Goal Completed!'
            : data.achievementType === 'milestone_reached'
            ? '🎯 Milestone Achieved!'
            : `🔥 ${data.streakCount}-Day Streak!`;

          const pushBody = `${data.completedBy} ${
            data.achievementType === 'goal_completed'
              ? `completed: ${data.goalTitle}`
              : data.achievementType === 'milestone_reached'
              ? `reached milestone: ${data.milestoneTitle}`
              : `achieved ${data.streakCount} days on ${data.goalTitle}`
          }`;

          const pushResult = await pushService.sendNotification(userId, {
            title: pushTitle,
            body: pushBody,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `goal-achievement-${data.goalId}`,
            data: {
              url: data.goalUrl,
              action: 'goal_achievement',
              goal_id: data.goalId,
              type: data.achievementType,
            },
          });

          if (pushResult.success) {
            results.push++;
          } else {
            results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
          }
        }

        // Store notification in database for in-app display
        await this.storeNotification({
          type: 'goal',
          title: data.achievementType === 'goal_completed'
            ? 'Goal Completed'
            : data.achievementType === 'milestone_reached'
            ? 'Milestone Achieved'
            : 'Streak Milestone',
          content: `${data.completedBy} ${
            data.achievementType === 'goal_completed'
              ? `completed the goal: ${data.goalTitle}`
              : data.achievementType === 'milestone_reached'
              ? `reached milestone: ${data.milestoneTitle} for ${data.goalTitle}`
              : `achieved a ${data.streakCount}-day streak on ${data.goalTitle}`
          }`,
          priority: data.achievementType === 'goal_completed' ? 'high' : 'medium',
          space_id: data.goalUrl.includes('space_id=')
            ? data.goalUrl.split('space_id=')[1].split('&')[0]
            : '',
          url: data.goalUrl,
          metadata: {
            goal_id: data.goalId,
            achievement_type: data.achievementType,
            completed_by: data.completedBy,
            completion_date: data.completionDate,
          },
        }, userId);

      } catch (error) {
        results.errors.push(`Error for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  },

  /**
   * Send task assignment notifications
   */
  async sendTaskAssignmentNotification(
    recipientIds: string[],
    data: TaskNotificationData
  ): Promise<{ email: number; push: number; errors: string[] }> {
    const results = { email: 0, push: 0, errors: [] as string[] };

    for (const userId of recipientIds) {
      try {
        // Get user info
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (!user) {
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        // Check preferences and send email
        const shouldSendEmail = await notificationService.shouldSendNotification(
          userId,
          'task',
          'email'
        );

        if (shouldSendEmail && user.email) {
          const emailResult = await emailService.sendTaskAssignmentEmail(
            user.email,
            user.name || 'User',
            data.spaceName,
            {
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

          // Log notification
          await notificationService.logNotification(
            userId,
            'email',
            'task',
            `Task assigned: ${data.taskTitle}`,
            emailResult.success ? 'sent' : 'failed',
            emailResult.error
          );
        }

        // Check preferences and send push
        const shouldSendPush = await notificationService.shouldSendNotification(
          userId,
          'task',
          'push'
        );

        if (shouldSendPush) {
          const pushResult = await pushService.sendNotification(userId, {
            title: '📋 New Task Assigned',
            body: `${data.assignedBy} assigned you: ${data.taskTitle}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `task-assignment-${data.taskId}`,
            data: {
              url: data.taskUrl,
              action: 'task_assignment',
              task_id: data.taskId,
              priority: data.priority,
            },
          });

          if (pushResult.success) {
            results.push++;
          } else {
            results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
          }
        }

        // Store notification in database
        await this.storeNotification({
          type: 'task',
          title: 'New Task Assigned',
          content: `${data.assignedBy} assigned you a new task: ${data.taskTitle}`,
          priority: data.priority === 'urgent' ? 'urgent' : data.priority === 'high' ? 'high' : 'medium',
          space_id: data.taskUrl.includes('space_id=')
            ? data.taskUrl.split('space_id=')[1].split('&')[0]
            : '',
          url: data.taskUrl,
          metadata: {
            task_id: data.taskId,
            assigned_by: data.assignedBy,
            due_date: data.dueDate,
            priority: data.priority,
          },
        }, userId);

      } catch (error) {
        results.errors.push(`Error for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  },

  /**
   * Send event reminder notifications
   */
  async sendEventReminderNotification(
    recipientIds: string[],
    data: EventNotificationData
  ): Promise<{ email: number; push: number; errors: string[] }> {
    const results = { email: 0, push: 0, errors: [] as string[] };

    for (const userId of recipientIds) {
      try {
        // Get user info
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (!user) {
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        // Check preferences and send email
        const shouldSendEmail = await notificationService.shouldSendNotification(
          userId,
          'event',
          'email'
        );

        if (shouldSendEmail && user.email) {
          const emailResult = await emailService.sendEventReminderEmail(
            user.email,
            user.name || 'User',
            data.spaceName,
            {
              eventTitle: data.eventTitle,
              eventDescription: data.description,
              startTime: data.startTime,
              endTime: data.endTime,
              location: data.location,
              isAllDay: data.isAllDay,
              organizer: data.organizer,
              reminderType: data.reminderType,
              eventUrl: data.eventUrl,
            }
          );

          if (emailResult.success) {
            results.email++;
          } else {
            results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
          }

          // Log notification
          await notificationService.logNotification(
            userId,
            'email',
            'event',
            `Event reminder: ${data.eventTitle}`,
            emailResult.success ? 'sent' : 'failed',
            emailResult.error
          );
        }

        // Check preferences and send push
        const shouldSendPush = await notificationService.shouldSendNotification(
          userId,
          'event',
          'push'
        );

        if (shouldSendPush) {
          const reminderTexts = {
            now: 'is starting now',
            '15min': 'starts in 15 minutes',
            '1hour': 'starts in 1 hour',
            '1day': 'is tomorrow',
          };

          const pushResult = await pushService.sendNotification(userId, {
            title: '📅 Event Reminder',
            body: `${data.eventTitle} ${reminderTexts[data.reminderType]}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `event-reminder-${data.eventId}`,
            data: {
              url: data.eventUrl,
              action: 'event_reminder',
              event_id: data.eventId,
              reminder_type: data.reminderType,
            },
          });

          if (pushResult.success) {
            results.push++;
          } else {
            results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
          }
        }

        // Store notification in database
        await this.storeNotification({
          type: 'event',
          title: 'Event Reminder',
          content: `${data.eventTitle} ${data.reminderType === 'now' ? 'is starting now' :
            data.reminderType === '15min' ? 'starts in 15 minutes' :
            data.reminderType === '1hour' ? 'starts in 1 hour' : 'is tomorrow'}`,
          priority: data.reminderType === 'now' ? 'urgent' : 'medium',
          space_id: data.eventUrl.includes('space_id=')
            ? data.eventUrl.split('space_id=')[1].split('&')[0]
            : '',
          url: data.eventUrl,
          metadata: {
            event_id: data.eventId,
            reminder_type: data.reminderType,
            start_time: data.startTime,
            organizer: data.organizer,
          },
        }, userId);

      } catch (error) {
        results.errors.push(`Error for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  },

  /**
   * Send new message notifications
   */
  async sendMessageNotification(
    recipientIds: string[],
    data: MessageNotificationData
  ): Promise<{ email: number; push: number; errors: string[] }> {
    const results = { email: 0, push: 0, errors: [] as string[] };

    for (const userId of recipientIds) {
      try {
        // Get user info
        const supabase = createClient();
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (!user) {
          results.errors.push(`User ${userId} not found`);
          continue;
        }

        // Check preferences and send email
        const shouldSendEmail = await notificationService.shouldSendNotification(
          userId,
          'message',
          'email'
        );

        if (shouldSendEmail && user.email) {
          const emailResult = await emailService.sendNewMessageEmail(
            user.email,
            user.name || 'User',
            data.spaceName,
            {
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              messagePreview: data.messagePreview,
              conversationTitle: data.conversationTitle,
              isDirectMessage: data.isDirectMessage,
              messageCount: data.messageCount,
              messageUrl: data.messageUrl,
            }
          );

          if (emailResult.success) {
            results.email++;
          } else {
            results.errors.push(`Email failed for ${userId}: ${emailResult.error}`);
          }

          // Log notification
          await notificationService.logNotification(
            userId,
            'email',
            'message',
            `New message from ${data.senderName}`,
            emailResult.success ? 'sent' : 'failed',
            emailResult.error
          );
        }

        // Check preferences and send push
        const shouldSendPush = await notificationService.shouldSendNotification(
          userId,
          'message',
          'push'
        );

        if (shouldSendPush) {
          const pushResult = await pushService.sendNotification(userId, {
            title: data.isDirectMessage ? '💬 New Direct Message' : '💬 New Message',
            body: `${data.senderName}: ${data.messagePreview.substring(0, 100)}${data.messagePreview.length > 100 ? '...' : ''}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `message-${data.messageUrl.split('/').pop()}`,
            data: {
              url: data.messageUrl,
              action: 'new_message',
              sender: data.senderName,
              is_direct: data.isDirectMessage,
            },
          });

          if (pushResult.success) {
            results.push++;
          } else {
            results.errors.push(`Push failed for ${userId}: ${pushResult.error}`);
          }
        }

        // Store notification in database
        await this.storeNotification({
          type: 'message',
          title: data.isDirectMessage ? 'New Direct Message' : 'New Message',
          content: `${data.senderName}: ${data.messagePreview}`,
          priority: data.isDirectMessage ? 'high' : 'medium',
          space_id: data.messageUrl.includes('space_id=')
            ? data.messageUrl.split('space_id=')[1].split('&')[0]
            : '',
          url: data.messageUrl,
          metadata: {
            sender_name: data.senderName,
            is_direct_message: data.isDirectMessage,
            conversation_title: data.conversationTitle,
            message_count: data.messageCount || 1,
          },
        }, userId);

      } catch (error) {
        results.errors.push(`Error for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  },

  /**
   * Store notification in database for in-app display
   */
  async storeNotification(payload: NotificationPayload, userId: string): Promise<void> {
    try {
      const supabase = createClient();
      await supabase.from('notifications').insert([{
        user_id: userId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        priority: payload.priority,
        space_id: payload.space_id,
        url: payload.url,
        metadata: payload.metadata,
        is_read: false,
        is_digested: false,
        created_at: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  },

  /**
   * Get space members for notification delivery
   */
  async getSpaceMembers(spaceId: string): Promise<string[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', spaceId);

      if (error) throw error;
      return data?.map(member => member.user_id) || [];
    } catch (error) {
      console.error('Error getting space members:', error);
      return [];
    }
  },

  /**
   * Send bulk digest notifications (called by cron)
   */
  async processBulkDigests(): Promise<{
    daily: { processed: number; sent: number };
    weekly: { processed: number; sent: number };
  }> {
    return await digestService.processAllDigests();
  },

  /**
   * Process immediate notifications for real-time events
   */
  async processImmediateNotifications(spaceId: string): Promise<void> {
    return await digestService.processImmediateNotifications(spaceId);
  },
};