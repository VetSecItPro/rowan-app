import { supabaseAdmin } from '@/lib/supabase/admin';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';
import type { SupabaseClient } from '@supabase/supabase-js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// =============================================
// TYPES
// =============================================

interface ReminderToNotify {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  reminder_time: string;
  space_id: string;
  created_by: string;
  assigned_to?: string;
}

interface NotificationBatch {
  userId: string;
  userEmail: string;
  userName: string;
  notifications: {
    reminder: ReminderToNotify;
    type: 'due' | 'overdue';
  }[];
}

// =============================================
// JOB LOGIC
// =============================================

/**
 * Main job function to check for due/overdue reminders and send notifications
 */
export async function processReminderNotifications(): Promise<{
  success: boolean;
  notificationsSent: number;
  emailsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let notificationsSent = 0;
  let emailsSent = 0;

  try {
    const supabase = supabaseAdmin;

    // Get reminders that need notifications
    const remindersToNotify = await getRemindersNeedingNotification(supabase);

    if (remindersToNotify.length === 0) {
      return { success: true, notificationsSent: 0, emailsSent: 0, errors: [] };
    }

    // Group notifications by user
    const notificationBatches = await groupNotificationsByUser(supabase, remindersToNotify);

    // Process each user's notifications
    for (const batch of notificationBatches) {
      try {
        // Send in-app notifications
        const inAppResults = await sendInAppNotifications(supabase, batch);
        notificationsSent += inAppResults.sent;
        if (inAppResults.error) errors.push(inAppResults.error);

        // Send email digest if enabled
        const emailResult = await sendEmailNotifications(supabase, batch);
        if (emailResult.sent) emailsSent++;
        if (emailResult.error) errors.push(emailResult.error);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process notifications for user ${batch.userId}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      notificationsSent,
      emailsSent,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Job failed: ${errorMessage}`);
    return { success: false, notificationsSent: 0, emailsSent: 0, errors };
  }
}

/**
 * Get reminders that need notifications (due in next 15 min or overdue)
 */
async function getRemindersNeedingNotification(supabase: SupabaseClient): Promise<ReminderToNotify[]> {
  const now = new Date();
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

  // Get reminders that are:
  // 1. Due within next 15 minutes
  // 2. Overdue (past due time and status is still active)
  const { data, error } = await supabase
    .from('reminders')
    .select('id, title, emoji, description, reminder_time, space_id, created_by, assigned_to')
    .eq('status', 'active')
    .not('reminder_time', 'is', null)
    .lte('reminder_time', fifteenMinutesFromNow.toISOString());

  if (error) {
    logger.error('Error fetching reminders:', error, { component: 'reminder-notifications-job', action: 'service_call' });
    throw new Error('Failed to fetch reminders');
  }

  // Filter out reminders that already have recent notifications (within last hour)
  const remindersWithoutRecentNotifications: ReminderToNotify[] = [];

  for (const reminder of data || []) {
    const { data: recentNotifications } = await supabase
      .from('reminder_notifications')
      .select('id')
      .eq('reminder_id', reminder.id)
      .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

    // Only notify if no notifications sent in last hour
    if (!recentNotifications || recentNotifications.length === 0) {
      remindersWithoutRecentNotifications.push(reminder);
    }
  }

  return remindersWithoutRecentNotifications;
}

async function shouldSendReminderNotification(
  supabase: SupabaseClient,
  userId: string,
  spaceId: string,
  type: 'due' | 'overdue',
  channel: 'in_app' | 'email'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('should_send_notification', {
      p_user_id: userId,
      p_space_id: spaceId,
      p_notification_type: type,
      p_channel: channel,
    });

    if (error) {
      logger.warn('should_send_notification RPC failed, defaulting to allow', { component: 'reminder-notifications-job', error: error.message });
      return true;
    }

    return Boolean(data);
  } catch (error) {
    logger.warn('Error evaluating notification preference, defaulting to allow', { component: 'reminder-notifications-job', error: String(error) });
    return true;
  }
}

/**
 * Group notifications by user (assignee or creator)
 */
async function groupNotificationsByUser(
  supabase: SupabaseClient,
  reminders: ReminderToNotify[]
): Promise<NotificationBatch[]> {
  const userMap = new Map<string, NotificationBatch>();
  const now = new Date();

  for (const reminder of reminders) {
    const isOverdue = new Date(reminder.reminder_time) < now;
    const notificationType = isOverdue ? 'overdue' : 'due';

    // Determine who should be notified
    const usersToNotify = new Set<string>();

    // Notify assignee if exists
    if (reminder.assigned_to) {
      usersToNotify.add(reminder.assigned_to);
    }

    // Notify creator if no assignee or if creator is different
    if (!reminder.assigned_to || reminder.assigned_to !== reminder.created_by) {
      usersToNotify.add(reminder.created_by);
    }

    // Fetch user details and add to batches
    for (const userId of usersToNotify) {
      if (!userMap.has(userId)) {
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (user) {
          userMap.set(userId, {
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            notifications: [],
          });
        }
      }

      const batch = userMap.get(userId);
      if (batch) {
        batch.notifications.push({
          reminder,
          type: notificationType,
        });
      }
    }
  }

  return Array.from(userMap.values());
}

/**
 * Send in-app notifications for a user batch
 */
async function sendInAppNotifications(supabase: SupabaseClient, batch: NotificationBatch): Promise<{
  sent: number;
  error?: string;
}> {
  let sent = 0;

  try {
    for (const { reminder, type } of batch.notifications) {
      try {
        const allowed = await shouldSendReminderNotification(supabase, batch.userId, reminder.space_id, type, 'in_app');
        if (!allowed) continue;

        const { error } = await supabase
          .from('reminder_notifications')
          .insert({
            reminder_id: reminder.id,
            user_id: batch.userId,
            type: type,
            channel: 'in_app',
          });

        if (!error) {
          sent++;
        } else {
          logger.error(`Failed to create in-app notification for reminder ${reminder.id}:`, error, { component: 'reminder-notifications-job', action: 'service_call' });
        }
      } catch (error) {
        logger.error(`Failed to create in-app notification for reminder ${reminder.id}:`, error, { component: 'reminder-notifications-job', action: 'service_call' });
      }
    }

    return { sent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { sent, error: `In-app notifications failed: ${errorMessage}` };
  }
}

/**
 * Send email notifications for a user batch
 */
async function sendEmailNotifications(supabase: SupabaseClient, batch: NotificationBatch): Promise<{
  sent: boolean;
  error?: string;
}> {
  try {
    // Create email notification records (respect per-reminder prefs)
    for (const { reminder, type } of batch.notifications) {
      const allowed = await shouldSendReminderNotification(supabase, batch.userId, reminder.space_id, type, 'email');
      if (!allowed) continue;

      try {
        await supabase
          .from('reminder_notifications')
          .insert({
            reminder_id: reminder.id,
            user_id: batch.userId,
            type: type,
            channel: 'email',
          });
      } catch (error) {
        logger.error(`Failed to create email notification record for reminder ${reminder.id}:`, error, { component: 'reminder-notifications-job', action: 'service_call' });
      }
    }

    if (!batch.userEmail) {
      return { sent: false, error: 'User email not found' };
    }

    // Send email via Resend
    const emailHtml = generateEmailHtml(batch);
    const emailSubject = generateEmailSubject(batch);

    if (!resend) {
      logger.warn('Resend API key not configured, skipping reminder email', { component: 'reminder-notifications-job' });
      return { sent: false };
    }

    const { error: sendError } = await resend.emails.send({
      from: 'Rowan <reminders@rowan.app>',
      to: batch.userEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (sendError) {
      return { sent: false, error: sendError.message || 'Email send failed' };
    }

    return { sent: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { sent: false, error: `Email failed: ${errorMessage}` };
  }
}

/**
 * Generate email subject line
 */
function generateEmailSubject(batch: NotificationBatch): string {
  const overdueCount = batch.notifications.filter((n) => n.type === 'overdue').length;
  const dueCount = batch.notifications.filter((n) => n.type === 'due').length;

  if (overdueCount > 0 && dueCount === 0) {
    return `${overdueCount} overdue reminder${overdueCount > 1 ? 's' : ''} need${overdueCount === 1 ? 's' : ''} your attention`;
  } else if (dueCount > 0 && overdueCount === 0) {
    return `${dueCount} reminder${dueCount > 1 ? 's are' : ' is'} due soon`;
  } else {
    return `${batch.notifications.length} reminders need your attention`;
  }
}

/**
 * Generate email HTML content
 */
function generateEmailHtml(batch: NotificationBatch): string {
  const overdueReminders = batch.notifications.filter((n) => n.type === 'overdue');
  const dueReminders = batch.notifications.filter((n) => n.type === 'due');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder Notifications</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Rowan Reminders</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Hi ${batch.userName}!</p>
  </div>

  ${
    overdueReminders.length > 0
      ? `
  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px;">⚠️ Overdue Reminders</h2>
    ${overdueReminders
      .map(
        ({ reminder }) => `
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #fee2e2;">
      <div style="font-size: 18px; margin-bottom: 5px;">
        <span style="margin-right: 8px;">${reminder.emoji || '🔔'}</span>
        <strong>${reminder.title}</strong>
      </div>
      ${reminder.description ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${reminder.description}</p>` : ''}
      <p style="margin: 5px 0 0 0; color: #ef4444; font-size: 13px; font-weight: 600;">
        📅 Was due: ${new Date(reminder.reminder_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
    `
      )
      .join('')}
  </div>
  `
      : ''
  }

  ${
    dueReminders.length > 0
      ? `
  <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2563eb; margin: 0 0 15px 0; font-size: 20px;">🔔 Due Soon</h2>
    ${dueReminders
      .map(
        ({ reminder }) => `
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #dbeafe;">
      <div style="font-size: 18px; margin-bottom: 5px;">
        <span style="margin-right: 8px;">${reminder.emoji || '🔔'}</span>
        <strong>${reminder.title}</strong>
      </div>
      ${reminder.description ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">${reminder.description}</p>` : ''}
      <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 13px; font-weight: 600;">
        📅 Due: ${new Date(reminder.reminder_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
    `
      )
      .join('')}
  </div>
  `
      : ''
  }

  <div style="text-align: center; margin-top: 30px;">
    <a href="${getAppUrl()}/reminders" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      View All Reminders
    </a>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 5px 0;">You're receiving this because you have reminder notifications enabled.</p>
    <p style="margin: 5px 0;">
      <a href="${getAppUrl()}/settings/notifications" style="color: #ec4899; text-decoration: none;">Manage notification preferences</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}
