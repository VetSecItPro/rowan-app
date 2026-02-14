import { createClient } from '@/lib/supabase/client';
import { addDays } from 'date-fns';

type ChoreRecord = {
  id: string;
  due_date?: string | null;
  space_id: string;
  title: string;
  description?: string | null;
  frequency: string;
  assigned_to?: string | null;
  created_by?: string | null;
};

type CalendarEventInsert = {
  space_id: string;
  title: string;
  description?: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  category: 'personal';
  status: 'not-started';
  assigned_to?: string | null;
  created_by?: string | null;
  is_recurring: boolean;
};

type ChoreCalendarPreferences = {
  auto_sync_chores: boolean;
  calendar_chore_filter?: string | null;
};

/** Service for syncing chores to calendar events and managing chore-calendar preferences. */
export const choreCalendarService = {
  /**
   * Sync a chore to calendar as events
   * Creates recurring events based on chore frequency
   */
  async syncChoreToCalendar(choreId: string): Promise<Record<string, unknown>[] | null> {
    const supabase = createClient();
    const { data: chore } = await supabase.from('chores').select('id, space_id, title, description, frequency, assigned_to, status, due_date, completed_at, notes, created_by, created_at, updated_at, sort_order, calendar_sync, category, point_value').eq('id', choreId).single();

    if (!chore || !chore.due_date) return null;

    // Generate recurring events based on frequency
    const events = this.generateChoreEvents(chore as ChoreRecord);

    // Insert events into calendar
    const { data: insertedEvents, error: eventError } = await supabase
      .from('events')
      .insert(events)
      .select();

    if (eventError) throw eventError;

    // Create sync records for tracking
    const syncRecords = insertedEvents.map((event: { id: string }) => ({
      chore_id: choreId,
      event_id: event.id,
      is_synced: true,
    }));

    const { data, error } = await supabase
      .from('chore_calendar_events')
      .insert(syncRecords)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Remove chore from calendar
   */
  async unsyncFromCalendar(choreId: string): Promise<void> {
    const supabase = createClient();

    // Get all synced events for this chore
    const { data: syncRecords } = await supabase
      .from('chore_calendar_events')
      .select('event_id')
      .eq('chore_id', choreId);

    if (syncRecords && syncRecords.length > 0) {
      // Delete the events
      const eventIds = syncRecords.map((record: { event_id: string }) => record.event_id);
      await supabase.from('events').delete().in('id', eventIds);
    }

    // Delete sync records
    await supabase.from('chore_calendar_events').delete().eq('chore_id', choreId);
  },

  /**
   * Generate recurring events for a chore based on its frequency
   */
  generateChoreEvents(chore: ChoreRecord, monthsAhead: number = 3): CalendarEventInsert[] {
    const events: CalendarEventInsert[] = [];
    if (!chore.due_date) return events; // No due date, no events to generate
    const startDate = new Date(chore.due_date);
    const endDate = addDays(startDate, monthsAhead * 30); // Generate events for next 3 months

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Create calendar event for this occurrence
      const event: CalendarEventInsert = {
        space_id: chore.space_id,
        title: `🧹 ${chore.title}`,
        description: chore.description,
        event_type: 'chore',
        start_time: currentDate.toISOString(),
        end_time: addDays(currentDate, 0).setHours(23, 59, 59).toString(),
        category: 'personal',
        status: 'not-started',
        assigned_to: chore.assigned_to,
        created_by: chore.created_by,
        is_recurring: chore.frequency !== 'once',
      };

      events.push(event);

      // Calculate next occurrence based on frequency
      currentDate = this.getNextOccurrence(currentDate, chore.frequency);

      // Break if frequency is 'once' or if we've hit our limit
      if (chore.frequency === 'once' || events.length >= 100) break;
    }

    return events;
  },

  /**
   * Calculate next occurrence based on frequency
   */
  getNextOccurrence(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'once':
      default:
        // For 'once', return a date far in the future to break the loop
        nextDate.setFullYear(nextDate.getFullYear() + 10);
        break;
    }

    return nextDate;
  },

  /**
   * Get calendar preferences for chores
   */
  async getCalendarPreferences(userId: string): Promise<ChoreCalendarPreferences> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select('show_chores_on_calendar, calendar_chore_filter')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      auto_sync_chores: data?.show_chores_on_calendar || false,
      calendar_chore_filter: data?.calendar_chore_filter
    };
  },

  /**
   * Update calendar preferences for chores
   */
  async updateCalendarPreferences(userId: string, autoSync: boolean): Promise<void> {
    const supabase = createClient();
    await supabase
      .from('users')
      .update({
        show_chores_on_calendar: autoSync,
      })
      .eq('id', userId);
  },
};
