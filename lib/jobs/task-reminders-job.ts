/**
 * Task Reminders Job
 *
 * Runs every 5 minutes to send pending task reminders.
 */

import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function processTaskReminders() {
  try {
    const { data: pendingReminders, error } = await supabaseAdmin.rpc('get_pending_reminders');
    if (error) throw error;

    let sent = 0;
    for (const reminder of pendingReminders || []) {
      try {
        // Send notification based on reminder_type
        if (reminder.reminder_type === 'notification' || reminder.reminder_type === 'both') {
          await sendPushNotification(reminder);
        }

        if (reminder.reminder_type === 'email' || reminder.reminder_type === 'both') {
          await sendEmailReminder(reminder);
        }

        // Mark as sent
        const { error: markError } = await supabaseAdmin.rpc('mark_reminder_sent', {
          reminder_id: reminder.reminder_id,
        });
        if (markError) throw markError;
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

async function sendPushNotification(reminder: { user_id: string; task_id: string; task_title: string }) {
  const { error } = await supabaseAdmin
    .from('in_app_notifications')
    .insert({
      user_id: reminder.user_id,
      type: 'reminder',
      title: 'Task Reminder',
      content: `⏰ Reminder: ${reminder.task_title}`,
      priority: 'normal',
      related_item_id: reminder.task_id,
      related_item_type: 'task',
      metadata: { task_id: reminder.task_id },
    });

  if (error) {
    throw error;
  }
}

async function sendEmailReminder(reminder: { user_id: string; task_id: string; task_title: string }) {
  // TODO: Implement email via Resend or similar
  logger.info(`Email reminder for task ${reminder.task_id}`, { component: 'task-reminders-job' });
}
