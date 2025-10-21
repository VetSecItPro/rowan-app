import { createClient } from '@/lib/supabase/client';

export const taskCalendarService = {
  async syncTaskToCalendar(taskId: string): Promise<any> {
    const supabase = createClient();
    const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
    if (!task || !task.due_date) return null;

    const { data: event, error: eventError } = await supabase.from('events').insert({
      space_id: task.space_id,
      title: `📋 ${task.title}`,
      description: task.description,
      event_type: 'task',
      start_time: new Date(task.due_date).toISOString(),
      end_time: new Date(new Date(task.due_date).getTime() + 3600000).toISOString(),
      assigned_to: task.assigned_to,
      created_by: task.created_by,
    }).select().single();

    if (eventError) throw eventError;

    const { data, error } = await supabase.from('task_calendar_events').insert({
      task_id: taskId,
      event_id: event.id,
      is_synced: true,
    }).select().single();

    if (error) throw error;
    return data;
  },

  async unsyncFromCalendar(taskId: string): Promise<void> {
    const supabase = createClient();
    const { data: sync } = await supabase.from('task_calendar_events').select('event_id').eq('task_id', taskId).single();
    if (sync?.event_id) {
      await supabase.from('events').delete().eq('id', sync.event_id);
    }
    await supabase.from('task_calendar_events').delete().eq('task_id', taskId);
  },

  async getCalendarPreferences(userId: string): Promise<any> {
    const supabase = createClient();
    const { data, error } = await supabase.from('users').select('show_tasks_on_calendar, calendar_task_filter').eq('id', userId).single();
    if (error) throw error;
    return {
      auto_sync_tasks: data?.show_tasks_on_calendar || false,
      calendar_task_filter: data?.calendar_task_filter
    };
  },

  async updateCalendarPreferences(userId: string, autoSync: boolean): Promise<void> {
    const supabase = createClient();
    await supabase.from('users').update({
      show_tasks_on_calendar: autoSync,
    }).eq('id', userId);
  },
};
