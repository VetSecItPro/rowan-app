import { createClient } from '@/lib/supabase/client';

type LinkedListRow = {
  task_id?: string;
  list?: {
    id?: string;
    title?: string;
    items?: Array<unknown>;
  };
};

/** Service for linking shopping lists to calendar events, tasks, and meals. */
export const shoppingIntegrationService = {
  // Calendar Integration
  async linkToCalendar(listId: string, eventId: string, reminderMinutes?: number) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_calendar_events')
      .insert([{
        list_id: listId,
        event_id: eventId,
        reminder_time: reminderMinutes,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCalendarEvent(listId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_calendar_events')
      .select('*, event:events(*)')
      .eq('list_id', listId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  async unlinkFromCalendar(listId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_calendar_events')
      .delete()
      .eq('list_id', listId);

    if (error) throw error;
  },

  async getShoppingListsForEvent(eventId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_calendar_events')
      .select('list_id, list:shopping_lists(id, title, items:shopping_items(id))')
      .eq('event_id', eventId);

    if (error) throw error;

    // Transform the data to include items_count
    const rows = (data ?? []) as LinkedListRow[];
    return rows.map((item) => ({
      id: item.list?.id,
      title: item.list?.title,
      items_count: item.list?.items?.length || 0,
    }));
  },

  // Tasks Integration
  async linkToTask(listId: string, taskId: string, syncCompletion = true) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_tasks')
      .insert([{
        list_id: listId,
        task_id: taskId,
        sync_completion: syncCompletion,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLinkedTask(listId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_tasks')
      .select('*, task:tasks(*)')
      .eq('list_id', listId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async unlinkFromTask(listId: string) {
    const supabase = createClient();
    const { error} = await supabase
      .from('shopping_tasks')
      .delete()
      .eq('list_id', listId);

    if (error) throw error;
  },

  async getShoppingListsForTask(taskId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_tasks')
      .select('list_id, list:shopping_lists(id, title, items:shopping_items(id))')
      .eq('task_id', taskId);

    if (error) throw error;

    // Transform the data to include items_count
    const rows = (data ?? []) as LinkedListRow[];
    return rows.map((item) => ({
      id: item.list?.id,
      title: item.list?.title,
      items_count: item.list?.items?.length || 0,
    }));
  },

  /**
   * Batch fetch shopping lists for multiple tasks in a single query
   * This replaces N individual queries with 1 query using .in() filter
   * @param taskIds Array of task IDs to fetch linked shopping lists for
   * @returns Map of taskId -> first linked shopping list (or undefined)
   */
  async getShoppingListsForTasks(taskIds: string[]): Promise<Record<string, { id: string; title: string; items_count: number } | undefined>> {
    if (taskIds.length === 0) {
      return {};
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_tasks')
      .select('task_id, list_id, list:shopping_lists(id, title, items:shopping_items(id))')
      .in('task_id', taskIds);

    if (error) throw error;

    // Group by task_id and take first linked list for each task
    const result: Record<string, { id: string; title: string; items_count: number } | undefined> = {};

    const rows = (data ?? []) as LinkedListRow[];
    rows.forEach((item) => {
      // Only set if we haven't seen this task yet (take first list)
      if (item.task_id && !result[item.task_id] && item.list && item.list.id && item.list.title) {
        result[item.task_id] = {
          id: item.list.id,
          title: item.list.title,
          items_count: item.list.items?.length || 0,
        };
      }
    });

    return result;
  },

  // Reminders Integration
  async linkToReminder(reminderId: string, listId?: string, itemId?: string, triggerType: 'time' | 'location' = 'time') {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_reminders')
      .insert([{
        list_id: listId,
        item_id: itemId,
        reminder_id: reminderId,
        trigger_type: triggerType,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getListReminders(listId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_reminders')
      .select('*, reminder:reminders(*)')
      .eq('list_id', listId);

    if (error) throw error;
    return data || [];
  },

  async getItemReminders(itemId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_reminders')
      .select('*, reminder:reminders(*)')
      .eq('item_id', itemId);

    if (error) throw error;
    return data || [];
  },

  async unlinkReminder(reminderId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_reminders')
      .delete()
      .eq('reminder_id', reminderId);

    if (error) throw error;
  },

  // Quick helper to create shopping trip with calendar event
  async createShoppingTrip(listId: string, title: string, startTime: string, spaceId: string, reminderMinutes = 60) {
    const supabase = createClient();

    // Create calendar event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert([{
        space_id: spaceId,
        title: title,
        start_time: startTime,
        event_type: 'other',
        description: 'Shopping trip',
      }])
      .select()
      .single();

    if (eventError) throw eventError;

    // Link to shopping list
    await this.linkToCalendar(listId, event.id, reminderMinutes);

    return event;
  },

  // Quick helper to create shopping task
  async createShoppingTask(listId: string, listTitle: string, spaceId: string, dueDate?: string) {
    const supabase = createClient();

    // Create task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert([{
        space_id: spaceId,
        title: `Buy groceries: ${listTitle}`,
        category: 'shopping',
        priority: 'medium',
        status: 'pending',
        due_date: dueDate,
      }])
      .select()
      .single();

    if (taskError) throw taskError;

    // Link to shopping list
    await this.linkToTask(listId, task.id);

    return task;
  },
};
