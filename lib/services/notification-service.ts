import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { getAppUrl } from '@/lib/utils/app-url';

/**
 * User information required for sending notifications.
 */
interface User {
  id: string;
  email: string | undefined;
  name?: string;
}

/**
 * User preferences for notification delivery channels and timing.
 */
interface NotificationPreferences {
  email_enabled: boolean;
  email_reminders: boolean;
  email_task_assignments: boolean;
  email_events: boolean;
  email_shopping_lists: boolean;
  email_meal_reminders: boolean;
  email_messages: boolean;
  email_digest_frequency: 'realtime' | 'daily' | 'weekly' | 'never';
  push_enabled: boolean;
  push_reminders: boolean;
  push_tasks: boolean;
  push_messages: boolean;
  push_shopping_updates: boolean;
  push_events: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

/**
 * Notification Service
 *
 * Client-side service for sending notifications via email and push channels.
 * Respects user preferences including quiet hours, channel preferences, and
 * category-specific settings. All email sending is delegated to API routes.
 */
export const notificationService = {
  /**
   * Retrieves the notification preferences for a user.
   *
   * @param userId - The unique identifier of the user
   * @returns The user's notification preferences, or null if not found
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('[notificationService] Error fetching preferences:', error, { component: 'lib-notification-service', action: 'service_call' });
      return null;
    }

    return data;
  },

  /**
   * Checks if the current time falls within the user's configured quiet hours.
   *
   * Quiet hours are evaluated in the user's local timezone. Supports overnight
   * quiet hours (e.g., 22:00 to 08:00).
   *
   * @param userId - The unique identifier of the user
   * @returns True if currently within quiet hours, false otherwise
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    if (!prefs || !prefs.quiet_hours_enabled) {
      return false;
    }

    try {
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: prefs.timezone || 'UTC' }));
      const currentTime = userTime.getHours() * 60 + userTime.getMinutes();

      const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
      const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      }

      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      logger.error('[notificationService] Error checking quiet hours:', error, { component: 'lib-notification-service', action: 'service_call' });
      return false;
    }
  },

  /**
   * Determines whether a notification should be sent based on user preferences.
   *
   * Checks the user's preferences for the specified category and delivery type,
   * as well as quiet hours. Returns false if notifications are disabled globally,
   * for the specific category, or if currently in quiet hours.
   *
   * @param userId - The unique identifier of the user
   * @param category - The notification category (reminder, task, shopping, meal, event, message)
   * @param type - The delivery channel (email or push)
   * @returns True if the notification should be sent, false otherwise
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

    // Check type-specific preferences
    if (type === 'email') {
      if (!prefs.email_enabled) return false;

      switch (category) {
        case 'reminder':
          return prefs.email_reminders;
        case 'task':
          return prefs.email_task_assignments;
        case 'event':
          return prefs.email_events;
        case 'shopping':
          return prefs.email_shopping_lists;
        case 'meal':
          return prefs.email_meal_reminders;
        case 'message':
          return prefs.email_messages;
        default:
          return false;
      }
    } else if (type === 'push') {
      if (!prefs.push_enabled) return false;

      switch (category) {
        case 'reminder':
          return prefs.push_reminders;
        case 'task':
          return prefs.push_tasks;
        case 'message':
          return prefs.push_messages;
        case 'shopping':
          return prefs.push_shopping_updates;
        case 'event':
          return prefs.push_events;
        default:
          return false;
      }
    }

    return false;
  },

  /**
   * Logs a notification delivery attempt to the database for tracking and debugging.
   *
   * Only executes in browser environments. Records the delivery channel, category,
   * status, and any error messages for failed deliveries.
   *
   * @param userId - The unique identifier of the recipient
   * @param type - The delivery channel (email or push)
   * @param category - The notification category
   * @param subject - The notification subject or title
   * @param status - The delivery status (sent, failed, or bounced)
   * @param errorMessage - Optional error message for failed deliveries
   */
  async logNotification(
    userId: string,
    type: 'email' | 'push',
    category: string,
    subject: string,
    status: 'sent' | 'failed' | 'bounced',
    errorMessage?: string
  ): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const response = await csrfFetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          category,
          subject,
          status,
          errorMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        logger.error('[notificationService] Failed to log notification:', errorData, { component: 'lib-notification-service', action: 'service_call' });
      }
    } catch (error) {
      logger.error('[notificationService] Failed to log notification:', error, { component: 'lib-notification-service', action: 'service_call' });
    }
  },

  /**
   * Sends an email via the notifications API route.
   *
   * This method is safe to call from both client and server contexts.
   * The actual email delivery is handled by the API route.
   *
   * @param to - The recipient email address
   * @param subject - The email subject line
   * @param html - The HTML content of the email
   * @returns An object indicating success or failure with an optional error message
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isServer = typeof window === 'undefined';
      const apiUrl = isServer
        ? `${getAppUrl()}/api/notifications/email`
        : '/api/notifications/email';
      const requestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'custom',
          recipient: to,
          subject,
          data: { html },
        }),
      };
      const response = isServer ? await fetch(apiUrl, requestInit) : await csrfFetch(apiUrl, requestInit);

      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('[notificationService] Email send exception:', error, { component: 'lib-notification-service', action: 'service_call' });
      return { success: false, error: String(error) };
    }
  },

  /**
   * Sends a task assignment notification email to a user.
   *
   * Respects user notification preferences before sending. The email includes
   * the task title, space name, and who assigned the task.
   *
   * @param user - The recipient user object containing id, email, and optional name
   * @param taskTitle - The title of the assigned task
   * @param spaceName - The name of the space containing the task
   * @param assignedBy - The name of the person who assigned the task
   */
  async sendTaskAssignmentEmail(
    user: User,
    taskTitle: string,
    spaceName: string,
    assignedBy: string
  ): Promise<void> {
    if (!user.email) return;

    const shouldSend = await this.shouldSendNotification(user.id, 'task', 'email');
    if (!shouldSend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .task-title { font-size: 20px; font-weight: bold; color: #9333ea; margin: 15px 0; }
            .button { display: inline-block; background: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 New Task Assignment</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            <p><strong>${assignedBy}</strong> assigned you a new task in <strong>${spaceName}</strong>:</p>
            <div class="task-title">${taskTitle}</div>
            <p>Click below to view and manage this task:</p>
            <a href="${getAppUrl()}/dashboard" class="button">View Task</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have email notifications enabled.</p>
            <p><a href="${getAppUrl()}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail(user.email, `New task assigned: ${taskTitle}`, html);
    await this.logNotification(
      user.id,
      'email',
      'task',
      `New task assigned: ${taskTitle}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  },

  /**
   * Sends a notification email when a shopping list is ready.
   *
   * Respects user notification preferences before sending. The email includes
   * the list title, item count, and a link to view the list.
   *
   * @param user - The recipient user object containing id, email, and optional name
   * @param listTitle - The title of the shopping list
   * @param listId - The unique identifier of the shopping list
   * @param itemCount - The number of items in the list
   * @param spaceName - The name of the space containing the list
   */
  async sendShoppingListEmail(
    user: User,
    listTitle: string,
    listId: string,
    itemCount: number,
    spaceName: string
  ): Promise<void> {
    if (!user.email) return;

    const shouldSend = await this.shouldSendNotification(user.id, 'shopping', 'email');
    if (!shouldSend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .highlight { font-size: 18px; font-weight: bold; color: #059669; margin: 15px 0; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛒 Your Shopping List is Ready!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            <p>Your shopping list <strong>${listTitle}</strong> has been generated from your meal plan in <strong>${spaceName}</strong>.</p>
            <div class="highlight">${itemCount} items ready to shop</div>
            <p>We've automatically aggregated and organized all ingredients from your planned meals.</p>
            <a href="${getAppUrl()}/shopping" class="button">View Shopping List</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have shopping list notifications enabled.</p>
            <p><a href="${getAppUrl()}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail(user.email, `🛒 Your shopping list is ready: ${listTitle}`, html);
    await this.logNotification(
      user.id,
      'email',
      'shopping',
      `Shopping list ready: ${listTitle}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  },

  /**
   * Sends a reminder notification email to a user.
   *
   * Respects user notification preferences before sending. The email includes
   * the reminder title, scheduled time, and space name.
   *
   * @param user - The recipient user object containing id, email, and optional name
   * @param reminderTitle - The title of the reminder
   * @param reminderTime - The formatted time string for the reminder
   * @param spaceName - The name of the space containing the reminder
   */
  async sendReminderEmail(
    user: User,
    reminderTitle: string,
    reminderTime: string,
    spaceName: string
  ): Promise<void> {
    if (!user.email) return;

    const shouldSend = await this.shouldSendNotification(user.id, 'reminder', 'email');
    if (!shouldSend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
            .content { background: #fdf2f8; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .reminder-title { font-size: 20px; font-weight: bold; color: #ec4899; margin: 15px 0; }
            .button { display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔔 Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            <p>You have a reminder in <strong>${spaceName}</strong>:</p>
            <div class="reminder-title">${reminderTitle}</div>
            <p><strong>Time:</strong> ${reminderTime}</p>
            <a href="${getAppUrl()}/reminders" class="button">View Reminders</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have reminder notifications enabled.</p>
            <p><a href="${getAppUrl()}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail(user.email, `🔔 Reminder: ${reminderTitle}`, html);
    await this.logNotification(
      user.id,
      'email',
      'reminder',
      `Reminder: ${reminderTitle}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  },

  /**
   * Sends an event reminder notification email to a user.
   *
   * Respects user notification preferences before sending. The email includes
   * the event title, scheduled time, and a link to the calendar.
   *
   * @param user - The recipient user object containing id, email, and optional name
   * @param eventTitle - The title of the upcoming event
   * @param eventTime - The formatted time string for the event
   * @param spaceName - The name of the space containing the event
   */
  async sendEventReminderEmail(
    user: User,
    eventTitle: string,
    eventTime: string,
    spaceName: string
  ): Promise<void> {
    if (!user.email) return;

    const shouldSend = await this.shouldSendNotification(user.id, 'event', 'email');
    if (!shouldSend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
            .content { background: #f5f3ff; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .event-title { font-size: 20px; font-weight: bold; color: #8b5cf6; margin: 15px 0; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📅 Upcoming Event</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            <p>You have an upcoming event in <strong>${spaceName}</strong>:</p>
            <div class="event-title">${eventTitle}</div>
            <p><strong>When:</strong> ${eventTime}</p>
            <a href="${getAppUrl()}/calendar" class="button">View Calendar</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have event notifications enabled.</p>
            <p><a href="${getAppUrl()}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail(user.email, `📅 Upcoming: ${eventTitle}`, html);
    await this.logNotification(
      user.id,
      'email',
      'event',
      `Event reminder: ${eventTitle}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  },

  /**
   * Sends a meal preparation reminder email to a user.
   *
   * Respects user notification preferences before sending. The email includes
   * the meal name, scheduled time, and a link to view the recipe.
   *
   * @param user - The recipient user object containing id, email, and optional name
   * @param mealName - The name of the meal to prepare
   * @param mealTime - The formatted time string for when the meal is scheduled
   * @param spaceName - The name of the space containing the meal plan
   */
  async sendMealReminderEmail(
    user: User,
    mealName: string,
    mealTime: string,
    spaceName: string
  ): Promise<void> {
    if (!user.email) return;

    const shouldSend = await this.shouldSendNotification(user.id, 'meal', 'email');
    if (!shouldSend) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
            .content { background: #fff7ed; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .meal-name { font-size: 20px; font-weight: bold; color: #f97316; margin: 15px 0; }
            .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍳 Meal Prep Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name || 'there'},</p>
            <p>Time to prepare your meal in <strong>${spaceName}</strong>:</p>
            <div class="meal-name">${mealName}</div>
            <p><strong>Scheduled for:</strong> ${mealTime}</p>
            <a href="${getAppUrl()}/meals" class="button">View Recipe</a>
          </div>
          <div class="footer">
            <p>You're receiving this because you have meal reminder notifications enabled.</p>
            <p><a href="${getAppUrl()}/settings?tab=notifications">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail(user.email, `🍳 Time to prep: ${mealName}`, html);
    await this.logNotification(
      user.id,
      'email',
      'meal',
      `Meal reminder: ${mealName}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  },
};
