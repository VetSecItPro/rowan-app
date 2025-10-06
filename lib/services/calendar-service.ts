import { supabase } from '@/lib/supabase';

export interface CalendarEvent {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  location?: string;
  color?: string;
  reminder_minutes?: number;
  recurrence_rule?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  space_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  reminder_minutes?: number;
  recurrence_rule?: string;
}

export interface EventStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export const calendarService = {
  async getEvents(spaceId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('space_id', spaceId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getEventById(id: string): Promise<CalendarEvent | null> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(id: string, updates: Partial<CreateEventInput>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getEventStats(spaceId: string): Promise<EventStats> {
    const events = await this.getEvents(spaceId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: events.length,
      today: events.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
      }).length,
      thisWeek: events.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= weekStart;
      }).length,
      thisMonth: events.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= monthStart;
      }).length,
    };
  },
};
