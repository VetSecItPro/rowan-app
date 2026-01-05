import { createClient } from '@/lib/supabase/server';
import { reminderNotificationsService } from '@/lib/services/reminder-notifications-service';
import { notificationService } from '@/lib/services/notification-service';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

// =============================================
// TYPES
// =============================================

interface CheckInReminderToNotify {
  id: string;
  goal_id: string;
  user_id: string;
  scheduled_for: string;
  goal_title: string;
  goal_description?: string;
  space_id: string;
  space_name: string;
  user_email: string;
  user_name: string;
}

interface CheckInNotificationBatch {
  userId: string;
  userEmail: string;
  userName: string;
  reminders: CheckInReminderToNotify[];
}

// =============================================
// JOB LOGIC
// =============================================

/**
 * Main job function to check for due check-in reminders and send notifications
 */
export async function processGoalCheckInNotifications(): Promise<{
  success: boolean;
  notificationsSent: number;
  emailsSent: number;
  remindersScheduled: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let notificationsSent = 0;
  let emailsSent = 0;
  let remindersScheduled = 0;

  try {
    const supabase = await createClient();

    // Get check-in reminders that need notifications
    const remindersToNotify = await getCheckInRemindersNeedingNotification(supabase);

    if (remindersToNotify.length === 0) {
      return { success: true, notificationsSent: 0, emailsSent: 0, remindersScheduled: 0, errors: [] };
    }

    // Group notifications by user
    const notificationBatches = groupNotificationsByUser(remindersToNotify);

    // Process each user's notifications
    for (const batch of notificationBatches) {
      try {
        // Send in-app notifications
        const inAppResults = await sendInAppNotifications(batch);
        notificationsSent += inAppResults.sent;
        if (inAppResults.error) errors.push(inAppResults.error);

        // Send email notifications if enabled
        const emailResult = await sendEmailNotifications(batch);
        if (emailResult.sent) emailsSent++;
        if (emailResult.error) errors.push(emailResult.error);

        // Mark reminders as notification sent
        await markRemindersAsNotificationSent(supabase, batch.reminders.map(r => r.id));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process check-in notifications for user ${batch.userId}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      notificationsSent,
      emailsSent,
      remindersScheduled,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Job failed: ${errorMessage}`);
    return { success: false, notificationsSent: 0, emailsSent: 0, remindersScheduled: 0, errors };
  }
}

/**
 * Get check-in reminders that need notifications (due within next 15 minutes)
 */
async function getCheckInRemindersNeedingNotification(supabase: any): Promise<CheckInReminderToNotify[]> {
  const now = new Date();
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

  // Get reminders that are:
  // 1. Scheduled within next 15 minutes
  // 2. Haven't had notification sent yet
  // 3. Aren't completed yet
  // 4. For active goals only
  const { data, error } = await supabase
    .from('goal_check_in_reminders')
    .select(`
      id,
      goal_id,
      user_id,
      scheduled_for,
      goals!goal_id!inner(
        id,
        title,
        description,
        status,
        space_id,
        spaces!space_id!inner(
          id,
          name
        )
      ),
      users!user_id!inner(
        id,
        email,
        name
      )
    `)
    .eq('notification_sent', false)
    .eq('completed', false)
    .eq('goals.status', 'active')
    .lte('scheduled_for', fifteenMinutesFromNow.toISOString())
    .gte('scheduled_for', now.toISOString());

  if (error) {
    logger.error('Error fetching check-in reminders:', error, { component: 'goal-checkin-notifications-job', action: 'service_call' });
    throw new Error('Failed to fetch check-in reminders');
  }

  // Transform the data
  return (data || []).map((reminder: any) => ({
    id: reminder.id,
    goal_id: reminder.goal_id,
    user_id: reminder.user_id,
    scheduled_for: reminder.scheduled_for,
    goal_title: reminder.goals.title,
    goal_description: reminder.goals.description,
    space_id: reminder.goals.space_id,
    space_name: reminder.goals.spaces.name,
    user_email: reminder.users.email,
    user_name: reminder.users.name,
  }));
}

/**
 * Group notifications by user
 */
function groupNotificationsByUser(reminders: CheckInReminderToNotify[]): CheckInNotificationBatch[] {
  const userMap = new Map<string, CheckInNotificationBatch>();

  for (const reminder of reminders) {
    if (!userMap.has(reminder.user_id)) {
      userMap.set(reminder.user_id, {
        userId: reminder.user_id,
        userEmail: reminder.user_email,
        userName: reminder.user_name,
        reminders: [],
      });
    }

    const batch = userMap.get(reminder.user_id);
    if (batch) {
      batch.reminders.push(reminder);
    }
  }

  return Array.from(userMap.values());
}

/**
 * Send in-app notifications for a user batch
 */
async function sendInAppNotifications(batch: CheckInNotificationBatch): Promise<{
  sent: number;
  error?: string;
}> {
  let sent = 0;

  try {
    for (const reminder of batch.reminders) {
      try {
        await reminderNotificationsService.createNotification({
          reminder_id: null, // Goal check-ins don't use reminder_id
          goal_id: reminder.goal_id,
          user_id: batch.userId,
          type: 'goal_checkin_due',
          channel: 'in_app',
          title: `Time for a check-in on "${reminder.goal_title}"`,
          message: `Your check-in for "${reminder.goal_title}" is scheduled for ${new Date(reminder.scheduled_for).toLocaleString()}`,
        });
        sent++;
      } catch (error) {
        logger.error(`Failed to create in-app notification for check-in reminder ${reminder.id}:`, error, { component: 'goal-checkin-notifications-job', action: 'service_call' });
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
async function sendEmailNotifications(batch: CheckInNotificationBatch): Promise<{
  sent: boolean;
  error?: string;
}> {
  try {
    // Check if user should receive goal check-in email notifications
    const shouldSend = await notificationService.shouldSendNotification(
      batch.userId,
      'reminder', // Use 'reminder' category for goal check-ins
      'email'
    );

    if (!shouldSend) {
      return { sent: false };
    }

    // Create email notification records
    for (const reminder of batch.reminders) {
      try {
        await reminderNotificationsService.createNotification({
          reminder_id: null,
          goal_id: reminder.goal_id,
          user_id: batch.userId,
          type: 'goal_checkin_due',
          channel: 'email',
          title: `Time for a check-in on "${reminder.goal_title}"`,
          message: `Your check-in for "${reminder.goal_title}" is scheduled for ${new Date(reminder.scheduled_for).toLocaleString()}`,
        });
      } catch (error) {
        logger.error(`Failed to create email notification record for check-in reminder ${reminder.id}:`, error, { component: 'goal-checkin-notifications-job', action: 'service_call' });
      }
    }

    // Send email via notification service
    await sendGoalCheckInReminderEmail(batch);

    return { sent: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { sent: false, error: `Email failed: ${errorMessage}` };
  }
}

/**
 * Send goal check-in reminder email
 */
async function sendGoalCheckInReminderEmail(batch: CheckInNotificationBatch): Promise<void> {
  const emailSubject = generateEmailSubject(batch);
  const emailHtml = generateEmailHtml(batch);

  const result = await notificationService.sendEmail(
    batch.userEmail,
    emailSubject,
    emailHtml
  );

  // Log the email notification
  for (const reminder of batch.reminders) {
    await notificationService.logNotification(
      batch.userId,
      'email',
      'goal_checkin',
      `Check-in reminder: ${reminder.goal_title}`,
      result.success ? 'sent' : 'failed',
      result.error
    );
  }
}

/**
 * Generate email subject line
 */
function generateEmailSubject(batch: CheckInNotificationBatch): string {
  const count = batch.reminders.length;

  if (count === 1) {
    return `🎯 Time to check in on "${batch.reminders[0].goal_title}"`;
  }

  return `🎯 ${count} goal check-ins are due`;
}

/**
 * Generate email HTML content
 */
function generateEmailHtml(batch: CheckInNotificationBatch): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goal Check-In Reminders</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Goal Check-In Time</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Hi ${batch.userName}!</p>
  </div>

  <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #0369a1; margin: 0 0 15px 0; font-size: 20px;">🔔 Time for Your Check-Ins</h2>
    <p style="margin: 0 0 20px 0; color: #334155;">It's time to reflect on your progress and update your goals. Regular check-ins help you stay on track and maintain momentum toward achieving your dreams.</p>

    ${batch.reminders
      .map(
        (reminder) => `
    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e0f2fe;">
      <div style="font-size: 18px; margin-bottom: 8px;">
        <span style="margin-right: 8px;">🎯</span>
        <strong>${reminder.goal_title}</strong>
      </div>
      ${reminder.goal_description ? `<p style="margin: 5px 0 8px 0; color: #64748b; font-size: 14px;">${reminder.goal_description}</p>` : ''}
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
        <p style="margin: 0; color: #0ea5e9; font-size: 13px; font-weight: 600;">
          📅 Scheduled: ${new Date(reminder.scheduled_for).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </p>
        <span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
          ${reminder.space_name}
        </span>
      </div>
    </div>
    `
      )
      .join('')}
  </div>

  <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
    <h3 style="color: #a16207; margin: 0 0 10px 0; font-size: 16px;">💡 Check-In Tips</h3>
    <ul style="margin: 0; padding-left: 20px; color: #713f12; font-size: 14px;">
      <li>Review your progress since the last check-in</li>
      <li>Note any challenges or blockers you've encountered</li>
      <li>Celebrate wins, no matter how small!</li>
      <li>Adjust your approach if needed</li>
      <li>Set intentions for the upcoming period</li>
    </ul>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <a href="${getAppUrl()}/goals" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
      Complete Your Check-Ins
    </a>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 5px 0;">You're receiving this because you have goal check-in reminders enabled.</p>
    <p style="margin: 5px 0;">
      <a href="${getAppUrl()}/settings/notifications" style="color: #6366f1; text-decoration: none;">Manage notification preferences</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Mark reminders as having notification sent
 */
async function markRemindersAsNotificationSent(supabase: any, reminderIds: string[]): Promise<void> {
  if (reminderIds.length === 0) return;

  const { error } = await supabase
    .from('goal_check_in_reminders')
    .update({
      notification_sent: true,
      notification_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', reminderIds);

  if (error) {
    logger.error('Error marking reminders as notification sent:', error, { component: 'goal-checkin-notifications-job', action: 'service_call' });
    throw error;
  }
}