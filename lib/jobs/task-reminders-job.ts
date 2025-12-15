/**
 * Task Reminders Job
 *
 * Runs every 5 minutes to send pending task reminders.
 */

import { createClient } from '@/lib/supabase/client';
import { taskRemindersService } from '@/lib/services/task-reminders-service';
import { logger } from '@/lib/logger';

export async function processTaskReminders() {
  try {
    const pendingReminders = await taskRemindersService.getPendingReminders();

    let sent = 0;
    for (const reminder of pendingReminders) {
      try {
        // Send notification based on reminder_type
        if (reminder.reminder_type === 'notification' || reminder.reminder_type === 'both') {
          await sendPushNotification(reminder);
        }

        if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
          await sendEmailReminder(reminder);
        }

        // Mark as sent
        await taskRemindersService.markReminderSent(reminder.reminder_id);
        sent++;
      } catch (error) {
        logger.error(`Failed to send reminder ${reminder.reminder_id}:`, error, { component: 'task-reminders-job', action: 'service_call' });
      }
    }

    logger.info(`Sent ${sent} task reminders`, { component: 'task-reminders-job' });
    return { success: true, sent };
  } catch (error) {
    logger.error('Error processing reminders:', error, { component: 'task-reminders-job', action: 'service_call' });
    return { success: false, error };
  }
}

async function sendPushNotification(reminder: any) {
  // TODO: Implement push notification via Supabase notifications table
  const supabase = createClient();
  await supabase.from('notifications').insert({
    user_id: reminder.user_id,
    type: 'task_reminder',
    title: 'Task Reminder',
    message: `⏰ Reminder: ${reminder.task_title}`,
    data: { task_id: reminder.task_id },
  });
}

async function sendEmailReminder(reminder: any) {
  // TODO: Implement email via Resend or similar
  logger.info(`Email reminder for task ${reminder.task_id}`, { component: 'task-reminders-job' });
}
