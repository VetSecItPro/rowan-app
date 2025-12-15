/**
 * Recurring Tasks Generation Job
 *
 * Runs daily at midnight to generate task instances from recurring templates.
 * Should be called by a cron job or Vercel Cron.
 */

import { createClient } from '@/lib/supabase/client';
import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
import { logger } from '@/lib/logger';

export async function generateRecurringTasks() {
  const supabase = createClient();

  try {
    // Get all active recurring templates
    const { data: templates, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurrence_template', true)
      .eq('status', 'active');

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    let generated = 0;

    for (const template of templates || []) {
      // Check if we need to generate a task for today
      const pattern = {
        pattern: template.recurrence_pattern,
        interval: template.recurrence_interval,
        days_of_week: template.recurrence_days_of_week,
        day_of_month: template.recurrence_day_of_month,
        month: template.recurrence_month,
        end_date: template.recurrence_end_date,
        end_count: template.recurrence_end_count,
        exceptions: template.recurrence_exceptions,
      };

      // Get latest instance
      const { data: latestInstance } = await supabase
        .from('tasks')
        .select('due_date')
        .eq('parent_recurrence_id', template.id)
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

      const lastDate = latestInstance?.due_date || template.created_at.split('T')[0];
      const nextDate = taskRecurrenceService.calculateNextDueDate(lastDate, pattern);

      if (nextDate && nextDate <= today) {
        // Check if task already exists for this date
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('parent_recurrence_id', template.id)
          .eq('due_date', nextDate)
          .single();

        if (!existing) {
          await taskRecurrenceService.generateNextOccurrence(template.id, nextDate);
          generated++;
        }
      }
    }

    logger.info(`Generated ${generated} recurring task instances`, { component: 'task-recurrence-job' });
    return { success: true, generated };
  } catch (error) {
    logger.error('Error generating recurring tasks:', error, { component: 'task-recurrence-job', action: 'service_call' });
    return { success: false, error };
  }
}
