import { createClient } from '@/lib/supabase/client';

export interface CalendarEvent {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  event_type?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  location?: string;
  category: 'work' | 'personal' | 'family' | 'health' | 'social';
  status: 'not-started' | 'in-progress' | 'completed';
  assigned_to?: string;
  created_by?: string;
  custom_color?: string; // NEW: Custom hex color
  timezone?: string; // NEW: Event timezone
  deleted_at?: string; // NEW: Soft delete timestamp
  deleted_by?: string; // NEW: Who deleted it
  created_at: string;
  updated_at: string;
}

export interface CreateEventInput {
  space_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  event_type?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  location?: string;
  category?: 'work' | 'personal' | 'family' | 'health' | 'social';
  assigned_to?: string;
  custom_color?: string; // NEW: Custom hex color
  timezone?: string; // NEW: Event timezone
}

export interface EventStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export const calendarService = {
  async getEvents(spaceId: string, includeDeleted = false): Promise<CalendarEvent[]> {
    const supabase = createClient();

    let query = supabase
      .from('events')
      .select('*')
      .eq('space_id', spaceId);

    // Exclude soft-deleted events by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getEventById(id: string): Promise<CalendarEvent | null> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(id: string, updates: Partial<CreateEventInput>): Promise<CalendarEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(id: string, permanent = false): Promise<void> {
    const supabase = createClient();

    if (permanent) {
      // Permanent delete
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } else {
      // Soft delete (30-day retention)
      const { error } = await supabase
        .from('events')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    }
  },

  async restoreEvent(id: string): Promise<CalendarEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .update({
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDeletedEvents(spaceId: string): Promise<CalendarEvent[]> {
    const supabase = createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('space_id', spaceId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', thirtyDaysAgo.toISOString())
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateEventStatus(id: string, status: 'not-started' | 'in-progress' | 'completed'): Promise<CalendarEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
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
        const eventDate = new Date(e.start_time);
        return eventDate >= today && eventDate < new Date(today.getTime() + 86400000);
      }).length,
      thisWeek: events.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= weekStart;
      }).length,
      thisMonth: events.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate >= monthStart;
      }).length,
    };
  },

  async duplicateEvent(id: string, newStartTime?: string): Promise<CalendarEvent> {
    const supabase = createClient();

    // Get original event
    const original = await this.getEventById(id);
    if (!original) throw new Error('Event not found');

    // Calculate new times
    const originalStart = new Date(original.start_time);
    const newStart = newStartTime ? new Date(newStartTime) : new Date(originalStart.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days default

    let newEnd;
    if (original.end_time) {
      const originalEnd = new Date(original.end_time);
      const duration = originalEnd.getTime() - originalStart.getTime();
      newEnd = new Date(newStart.getTime() + duration).toISOString();
    }

    // Create duplicate
    const { data, error } = await supabase
      .from('events')
      .insert([{
        space_id: original.space_id,
        title: `${original.title} (Copy)`,
        description: original.description,
        start_time: newStart.toISOString(),
        end_time: newEnd,
        event_type: original.event_type,
        is_recurring: false, // Don't duplicate recurrence
        location: original.location,
        category: original.category,
        custom_color: original.custom_color,
        timezone: original.timezone
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEventColor(id: string, customColor: string): Promise<CalendarEvent> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .update({ custom_color: customColor })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async searchEvents(spaceId: string, query: string): Promise<CalendarEvent[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('space_id', spaceId)
      .is('deleted_at', null)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};
