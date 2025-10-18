import { createClient } from '@/lib/supabase/server';
import * as emailService from './email-service';

// Types for queue processing
export interface QueuedNotification {
  id: string;
  user_id: string;
  notification_type: 'email' | 'push';
  category: 'task' | 'reminder' | 'message' | 'shopping' | 'meal' | 'event' | 'general';
  priority: 'urgent' | 'normal' | 'low';
  subject: string;
  content: any; // JSON data for the specific notification type
  scheduled_for: string;
  digest_eligible: boolean;
  status: 'pending' | 'sent' | 'failed' | 'batched';
  attempts: number;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  email_task_assignments: boolean;
  email_event_reminders: boolean;
  email_new_messages: boolean;
  email_shopping_lists: boolean;
  email_meal_reminders: boolean;
  email_general_reminders: boolean;
  digest_frequency: 'realtime' | 'daily' | 'weekly';
  digest_time: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

/**
 * Add a notification to the queue for processing
 */
export async function queueEmailNotification(
  userId: string,
  category: QueuedNotification['category'],
  priority: QueuedNotification['priority'],
  subject: string,
  content: any,
  scheduledFor?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        notification_type: 'email',
        category,
        priority,
        subject,
        content,
        scheduled_for: scheduledFor?.toISOString() || new Date().toISOString(),
        digest_eligible: priority !== 'urgent', // Urgent notifications bypass digest
        status: 'pending'
      });

    if (error) {
      console.error('Failed to queue notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error queuing notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process pending notifications based on user preferences
 */
export async function processNotificationQueue(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    const supabase = createClient();

    // Get all users with pending notifications
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        *,
        user:auth.users(email, raw_user_meta_data)
      `)
      .eq('status', 'pending')
      .eq('notification_type', 'email')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      results.errors.push(`Failed to fetch pending notifications: ${fetchError.message}`);
      return results;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return results; // No pending notifications
    }

    // Group notifications by user
    const notificationsByUser = pendingNotifications.reduce((acc, notification) => {
      if (!acc[notification.user_id]) {
        acc[notification.user_id] = [];
      }
      acc[notification.user_id].push(notification);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each user's notifications
    for (const [userId, userNotifications] of Object.entries(notificationsByUser)) {
      try {
        const processResult = await processUserNotifications(userId, userNotifications);
        results.processed += processResult.processed;
        results.failed += processResult.failed;
        results.errors.push(...processResult.errors);
      } catch (error) {
        results.failed += userNotifications.length;
        results.errors.push(`Failed to process notifications for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  } catch (error) {
    results.errors.push(`Queue processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

/**
 * Process notifications for a specific user based on their preferences
 */
async function processUserNotifications(
  userId: string,
  notifications: any[]
): Promise<{ processed: number; failed: number; errors: string[] }> {
  const results = { processed: 0, failed: 0, errors: [] as string[] };

  try {
    const supabase = createClient();

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (prefError) {
      results.errors.push(`Failed to get preferences for user ${userId}: ${prefError.message}`);
      return results;
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser.user?.email) {
      results.errors.push(`Failed to get user email for ${userId}`);
      return results;
    }

    const userEmail = authUser.user.email;
    const userName = authUser.user.user_metadata?.name || 'Partner';

    // Check if we're in quiet hours
    if (isInQuietHours(preferences)) {
      // Reschedule non-urgent notifications for after quiet hours
      const nonUrgentNotifications = notifications.filter(n => n.priority !== 'urgent');
      if (nonUrgentNotifications.length > 0) {
        await rescheduleAfterQuietHours(nonUrgentNotifications, preferences);
      }

      // Process only urgent notifications during quiet hours
      notifications = notifications.filter(n => n.priority === 'urgent');
    }

    // Separate urgent notifications from digest-eligible ones
    const urgentNotifications = notifications.filter(n => n.priority === 'urgent' || !n.digest_eligible);
    const digestNotifications = notifications.filter(n => n.priority !== 'urgent' && n.digest_eligible);

    // Process urgent notifications immediately
    for (const notification of urgentNotifications) {
      if (shouldSendNotification(notification.category, preferences)) {
        const result = await sendSingleNotification(notification, userEmail, userName);
        if (result.success) {
          await markNotificationSent(notification.id);
          results.processed++;
        } else {
          await markNotificationFailed(notification.id, result.error || 'Unknown error');
          results.failed++;
          results.errors.push(`Failed to send ${notification.category} notification: ${result.error}`);
        }
      } else {
        // User has disabled this type of notification
        await markNotificationSent(notification.id);
        results.processed++;
      }
    }

    // Process digest notifications based on frequency
    if (digestNotifications.length > 0) {
      const digestResult = await processDigestNotifications(
        digestNotifications,
        preferences,
        userEmail,
        userName
      );
      results.processed += digestResult.processed;
      results.failed += digestResult.failed;
      results.errors.push(...digestResult.errors);
    }

    return results;
  } catch (error) {
    results.errors.push(`Error processing user notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

/**
 * Check if current time is within user's quiet hours
 */
function isInQuietHours(preferences: UserPreferences): boolean {
  if (!preferences.quiet_hours_enabled) return false;

  const now = new Date();
  const userTimezone = preferences.timezone || 'UTC';

  try {
    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Parse quiet hours
    const [startHour, startMinute] = preferences.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

/**
 * Check if user wants to receive this type of notification
 */
function shouldSendNotification(category: string, preferences: UserPreferences): boolean {
  const categoryMap = {
    task: preferences.email_task_assignments,
    event: preferences.email_event_reminders,
    message: preferences.email_new_messages,
    shopping: preferences.email_shopping_lists,
    meal: preferences.email_meal_reminders,
    reminder: preferences.email_general_reminders,
    general: preferences.email_general_reminders
  };

  return categoryMap[category as keyof typeof categoryMap] ?? true;
}

/**
 * Send a single notification immediately
 */
async function sendSingleNotification(
  notification: QueuedNotification,
  userEmail: string,
  userName: string
): Promise<emailService.EmailResult> {
  const emailData = {
    recipientEmail: userEmail,
    recipientName: userName,
    ...notification.content
  };

  switch (notification.category) {
    case 'task':
      return emailService.sendTaskAssignmentEmail(emailData);
    case 'event':
      return emailService.sendEventReminderEmail(emailData);
    case 'message':
      return emailService.sendNewMessageEmail(emailData);
    case 'shopping':
      return emailService.sendShoppingListEmail(emailData);
    case 'meal':
      return emailService.sendMealReminderEmail(emailData);
    case 'reminder':
    case 'general':
      return emailService.sendGeneralReminderEmail(emailData);
    default:
      return { success: false, error: 'Unknown notification category' };
  }
}

/**
 * Process digest notifications based on user's digest frequency
 */
async function processDigestNotifications(
  notifications: QueuedNotification[],
  preferences: UserPreferences,
  userEmail: string,
  userName: string
): Promise<{ processed: number; failed: number; errors: string[] }> {
  const results = { processed: 0, failed: 0, errors: [] as string[] };

  try {
    if (preferences.digest_frequency === 'realtime') {
      // Send each notification individually
      for (const notification of notifications) {
        if (shouldSendNotification(notification.category, preferences)) {
          const result = await sendSingleNotification(notification, userEmail, userName);
          if (result.success) {
            await markNotificationSent(notification.id);
            results.processed++;
          } else {
            await markNotificationFailed(notification.id, result.error || 'Unknown error');
            results.failed++;
            results.errors.push(`Failed to send ${notification.category} notification: ${result.error}`);
          }
        } else {
          await markNotificationSent(notification.id);
          results.processed++;
        }
      }
    } else {
      // Check if it's time to send digest
      if (shouldSendDigest(preferences)) {
        const digestResult = await createAndSendDigest(notifications, preferences, userEmail, userName);
        if (digestResult.success) {
          // Mark all notifications as batched
          for (const notification of notifications) {
            await markNotificationBatched(notification.id);
          }
          results.processed += notifications.length;
        } else {
          results.failed += notifications.length;
          results.errors.push(`Failed to send digest: ${digestResult.error}`);
        }
      }
      // If not time for digest, leave notifications in queue
    }

    return results;
  } catch (error) {
    results.errors.push(`Error processing digest notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return results;
  }
}

/**
 * Check if it's time to send a digest based on user preferences
 */
function shouldSendDigest(preferences: UserPreferences): boolean {
  const now = new Date();
  const userTimezone = preferences.timezone || 'UTC';

  try {
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const [digestHour, digestMinute] = preferences.digest_time.split(':').map(Number);

    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();

    // Check if current time matches digest time (within 30 minutes)
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (digestHour * 60 + digestMinute));

    if (preferences.digest_frequency === 'daily') {
      return timeDiff <= 30; // Send if within 30 minutes of digest time
    } else if (preferences.digest_frequency === 'weekly') {
      // Send weekly digest on Sunday at digest time
      return userTime.getDay() === 0 && timeDiff <= 30;
    }

    return false;
  } catch (error) {
    console.error('Error checking digest time:', error);
    return false;
  }
}

/**
 * Create and send a digest email from queued notifications
 */
async function createAndSendDigest(
  notifications: QueuedNotification[],
  preferences: UserPreferences,
  userEmail: string,
  userName: string
): Promise<emailService.EmailResult> {
  try {
    // Convert notifications to digest format
    const digestNotifications: emailService.DigestNotification[] = notifications
      .filter(n => shouldSendNotification(n.category, preferences))
      .map(n => ({
        id: n.id,
        type: n.category as any,
        title: n.subject,
        content: n.content.description || n.content.content || 'No description',
        priority: n.priority as any,
        spaceName: n.content.spaceName || 'Unknown Space',
        url: generateNotificationUrl(n),
        timestamp: formatTimestamp(n.created_at)
      }));

    // Calculate stats
    const taskCount = digestNotifications.filter(n => n.type === 'task').length;
    const eventCount = digestNotifications.filter(n => n.type === 'event').length;
    const messageCount = digestNotifications.filter(n => n.type === 'message').length;

    const digestData: emailService.DailyDigestData = {
      recipientEmail: userEmail,
      recipientName: userName,
      digestDate: new Date().toLocaleDateString(),
      digestType: preferences.digest_frequency as 'daily' | 'weekly',
      notifications: digestNotifications,
      totalCount: digestNotifications.length,
      unreadTasksCount: taskCount,
      upcomingEventsCount: eventCount,
      unreadMessagesCount: messageCount
    };

    return emailService.sendDailyDigestEmail(digestData);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper functions for updating notification status
 */
async function markNotificationSent(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notification_queue')
    .update({ status: 'sent', last_attempt: new Date().toISOString() })
    .eq('id', notificationId);
}

async function markNotificationFailed(notificationId: string, error: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notification_queue')
    .update({
      status: 'failed',
      last_attempt: new Date().toISOString(),
      error_message: error,
      attempts: supabase.rpc('increment_attempts', { notification_id: notificationId })
    })
    .eq('id', notificationId);
}

async function markNotificationBatched(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notification_queue')
    .update({ status: 'batched', last_attempt: new Date().toISOString() })
    .eq('id', notificationId);
}

async function rescheduleAfterQuietHours(
  notifications: QueuedNotification[],
  preferences: UserPreferences
): Promise<void> {
  const supabase = createClient();

  // Calculate when quiet hours end
  const now = new Date();
  const [endHour, endMinute] = preferences.quiet_hours_end.split(':').map(Number);
  const endTime = new Date(now);
  endTime.setHours(endHour, endMinute, 0, 0);

  // If end time is before now, it's tomorrow
  if (endTime <= now) {
    endTime.setDate(endTime.getDate() + 1);
  }

  const notificationIds = notifications.map(n => n.id);
  await supabase
    .from('notification_queue')
    .update({ scheduled_for: endTime.toISOString() })
    .in('id', notificationIds);
}

function generateNotificationUrl(notification: QueuedNotification): string {
  const baseUrl = 'https://rowanapp.com';
  const spaceId = notification.content.spaceId;

  switch (notification.category) {
    case 'task':
      return `${baseUrl}/spaces/${spaceId}/tasks/${notification.content.taskId}`;
    case 'event':
      return `${baseUrl}/spaces/${spaceId}/calendar/${notification.content.eventId}`;
    case 'message':
      return `${baseUrl}/spaces/${spaceId}/messages/${notification.content.conversationId}`;
    case 'shopping':
      return `${baseUrl}/spaces/${spaceId}/shopping/${notification.content.listId}`;
    case 'meal':
      return `${baseUrl}/spaces/${spaceId}/meals/${notification.content.mealId}`;
    case 'reminder':
      return `${baseUrl}/spaces/${spaceId}/reminders/${notification.content.reminderId}`;
    default:
      return `${baseUrl}/spaces/${spaceId}`;
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Clean up old processed notifications (called by cron job)
 */
export async function cleanupOldNotifications(): Promise<{ deleted: number; error?: string }> {
  try {
    const supabase = createClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error, count } = await supabase
      .from('notification_queue')
      .delete()
      .in('status', ['sent', 'failed'])
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) {
      return { deleted: 0, error: error.message };
    }

    return { deleted: count || 0 };
  } catch (error) {
    return {
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}