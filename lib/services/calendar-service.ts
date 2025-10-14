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

export interface EventTemplate {
  id: string;
  space_id: string;
  created_by: string;
  name: string;
  description?: string;
  category: 'work' | 'personal' | 'family' | 'health' | 'social';
  icon?: string;
  is_system_template: boolean;
  default_duration?: number; // minutes
  default_location?: string;
  default_attendees?: string[];
  default_reminders?: any;
  default_color?: string;
  default_recurrence?: any;
  use_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  space_id: string;
  name: string;
  description?: string;
  category: 'work' | 'personal' | 'family' | 'health' | 'social';
  icon?: string;
  default_duration?: number;
  default_location?: string;
  default_attendees?: string[];
  default_reminders?: any;
  default_color?: string;
  default_recurrence?: any;
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
  },

  // ==========================================
  // EVENT TEMPLATES
  // ==========================================

  async getTemplates(spaceId: string): Promise<EventTemplate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_templates')
      .select('*')
      .or(`space_id.eq.${spaceId},is_system_template.eq.true`)
      .order('is_system_template', { ascending: false })
      .order('use_count', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getTemplateById(id: string): Promise<EventTemplate | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createTemplate(input: CreateTemplateInput): Promise<EventTemplate> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('event_templates')
      .insert({
        ...input,
        created_by: user.id,
        is_system_template: false,
        use_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, updates: Partial<CreateTemplateInput>): Promise<EventTemplate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('event_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('event_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async useTemplate(templateId: string): Promise<EventTemplate> {
    const supabase = createClient();

    // First, get the current template
    const { data: template, error: fetchError } = await supabase
      .from('event_templates')
      .select('use_count')
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    // Update with incremented count
    const { data, error } = await supabase
      .from('event_templates')
      .update({
        use_count: (template?.use_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createEventFromTemplate(
    template: EventTemplate,
    startTime: string,
    overrides?: Partial<CreateEventInput>
  ): Promise<CalendarEvent> {
    // Calculate end time based on template default duration
    let endTime = overrides?.end_time;
    if (!endTime && template.default_duration) {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + template.default_duration * 60000);
      endTime = end.toISOString();
    }

    const eventInput: CreateEventInput = {
      space_id: template.space_id,
      title: template.name,
      description: template.description,
      start_time: startTime,
      end_time: endTime,
      location: template.default_location,
      category: template.category,
      custom_color: template.default_color,
      ...overrides
    };

    // Increment template usage count
    await this.useTemplate(template.id);

    return this.createEvent(eventInput);
  },

  async ensureSystemTemplates(spaceId: string): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if system templates already exist for this space
    const { data: existing } = await supabase
      .from('event_templates')
      .select('id')
      .eq('space_id', spaceId)
      .eq('is_system_template', true)
      .limit(1);

    if (existing && existing.length > 0) return; // Already exists

    // System templates to create
    const systemTemplates = [
      { name: 'Date Night', description: 'Romantic evening out with your partner', category: 'family' as const, icon: '💑', default_duration: 180 },
      { name: 'Doctor Appointment', description: 'Medical checkup or doctor visit', category: 'health' as const, icon: '🏥', default_duration: 60 },
      { name: 'Dentist Visit', description: 'Dental checkup or cleaning', category: 'health' as const, icon: '🦷', default_duration: 60 },
      { name: 'Team Meeting', description: 'Regular team sync or standup', category: 'work' as const, icon: '💼', default_duration: 60 },
      { name: 'Coffee Chat', description: 'Casual coffee meeting', category: 'social' as const, icon: '☕', default_duration: 30 },
      { name: 'Gym Session', description: 'Workout or exercise time', category: 'health' as const, icon: '💪', default_duration: 60 },
      { name: 'Lunch Break', description: 'Scheduled lunch time', category: 'personal' as const, icon: '🍽️', default_duration: 60 },
      { name: 'Parent-Teacher Conference', description: 'School meeting about kids', category: 'family' as const, icon: '👨‍🏫', default_duration: 45 },
      { name: 'Birthday Party', description: 'Birthday celebration', category: 'social' as const, icon: '🎂', default_duration: 120 },
      { name: 'Project Deadline', description: 'Important project due date', category: 'work' as const, icon: '📅', default_duration: 0 }
    ];

    // Insert all system templates
    const { error } = await supabase
      .from('event_templates')
      .insert(
        systemTemplates.map(template => ({
          ...template,
          space_id: spaceId,
          created_by: user.id,
          is_system_template: true,
          use_count: 0
        }))
      );

    if (error) throw error;
  }
};
