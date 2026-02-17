/**
 * Recurring Tasks Generation Job
 *
 * Runs daily at midnight to generate task instances from recurring templates.
 * Should be called by a cron job or Vercel Cron.
 */

import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function generateRecurringTasks() {
  const supabase = supabaseAdmin;

  try {
    // Get all active recurring templates
    const { data: templates, error } = await supabase
      .from('tasks')
      .select('id, space_id, title, description, category, priority, assigned_to, created_by, created_at, recurrence_pattern, recurrence_interval, recurrence_days_of_week, recurrence_day_of_month, recurrence_month, recurrence_end_date, recurrence_end_count, recurrence_exceptions')
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
        const { data: existing, error: existingError } = await supabase
          .from('tasks')
          .select('id')
          .eq('parent_recurrence_id', template.id)
          .eq('due_date', nextDate)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        if (!existing) {
          const { error: insertError } = await supabase
            .from('tasks')
            .insert({
              space_id: template.space_id,
              title: template.title,
              description: template.description,
              category: template.category,
              priority: template.priority,
              status: 'pending',
              due_date: nextDate,
              assigned_to: template.assigned_to,
              created_by: template.created_by,
              is_recurring: true,
              parent_recurrence_id: template.id,
              is_recurrence_template: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;
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
