import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSearchInput } from '@/lib/utils';
import { cacheAside, cacheKeys, CACHE_TTL } from '@/lib/cache';
import type { EnhancedRecurrencePattern } from './recurring-events-service';

/**
 * Security: Default maximum limit for list queries to prevent unbounded data retrieval
 * This protects against DoS attacks and ensures predictable API response sizes
 */
const DEFAULT_MAX_LIMIT = 500;

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

type EventReminderConfig = Record<string, unknown>;
type EventRecurrenceConfig = Record<string, unknown>;

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
  custom_color?: string; // Custom hex color
  timezone?: string; // Event timezone
  deleted_at?: string; // Soft delete timestamp
  deleted_by?: string; // Who deleted it
  show_countdown?: boolean; // Display as countdown widget on dashboard
  countdown_label?: string; // Custom countdown label (e.g., "Birthday!", "Vacation!")
  linked_bill_id?: string; // Link to bill if this event is for a bill due date
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
  custom_color?: string; // Custom hex color
  timezone?: string; // Event timezone
  show_countdown?: boolean; // Display as countdown widget
  countdown_label?: string; // Custom countdown label
  linked_bill_id?: string; // Link to bill if this event is for a bill due date
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
  default_reminders?: EventReminderConfig;
  default_color?: string;
  default_recurrence?: EventRecurrenceConfig;
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
  default_reminders?: EventReminderConfig;
  default_color?: string;
  default_recurrence?: EventRecurrenceConfig;
}

export const calendarService = {
  async getEvents(spaceId: string, includeDeleted = false, supabaseClient?: SupabaseClient): Promise<CalendarEvent[]> {
    const supabase = getSupabaseClient(supabaseClient);

    let query = supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('space_id', spaceId);

    // Exclude soft-deleted events by default
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // SECURITY: Apply default limit to prevent unbounded queries
    const { data, error } = await query
      .order('start_time', { ascending: true })
      .limit(DEFAULT_MAX_LIMIT);

    if (error) throw error;
    return data || [];
  },

  async getEventById(id: string, supabaseClient?: SupabaseClient): Promise<CalendarEvent | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error} = await supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createEvent(input: CreateEventInput, supabaseClient?: SupabaseClient): Promise<CalendarEvent> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('events')
      .insert([input])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(id: string, updates: Partial<CreateEventInput>, supabaseClient?: SupabaseClient): Promise<CalendarEvent> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(id: string, permanent = false, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);

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

  /**
   * Bulk delete events (soft delete by default)
   */
  async deleteEvents(ids: string[], permanent = false): Promise<{ deleted: number; errors: string[] }> {
    const supabase = createClient();
    let deleted = 0;
    const errors: string[] = [];

    if (permanent) {
      // Permanent bulk delete
      const { error, count } = await supabase
        .from('events')
        .delete()
        .in('id', ids);

      if (error) {
        errors.push(`Bulk delete failed: ${error.message}`);
      } else {
        deleted = count || ids.length;
      }
    } else {
      // Soft bulk delete (30-day retention)
      const { error, count } = await supabase
        .from('events')
        .update({
          deleted_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        errors.push(`Bulk delete failed: ${error.message}`);
      } else {
        deleted = count || ids.length;
      }
    }

    return { deleted, errors };
  },

  /**
   * Delete all events from a specific source (e.g., imported from Google Calendar)
   */
  async deleteEventsBySource(spaceId: string, source: string, permanent = false): Promise<{ deleted: number; errors: string[] }> {
    const supabase = createClient();

    // First get all event IDs from this source
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .eq('space_id', spaceId)
      .eq('event_type', source)
      .is('deleted_at', null);

    if (fetchError) {
      return { deleted: 0, errors: [`Failed to fetch events: ${fetchError.message}`] };
    }

    if (!events || events.length === 0) {
      return { deleted: 0, errors: [] };
    }

    const ids = events.map((e: { id: string }) => e.id);
    return this.deleteEvents(ids, permanent);
  },

  /**
   * Permanently delete all soft-deleted events (admin function)
   */
  async purgeDeletedEvents(spaceId: string): Promise<{ deleted: number; errors: string[] }> {
    const supabase = createClient();
    const errors: string[] = [];

    const { error, count } = await supabase
      .from('events')
      .delete()
      .eq('space_id', spaceId)
      .not('deleted_at', 'is', null);

    if (error) {
      errors.push(`Purge failed: ${error.message}`);
      return { deleted: 0, errors };
    }

    return { deleted: count || 0, errors };
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
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
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
    return cacheAside(
      cacheKeys.calendarStats(spaceId),
      async () => {
        const supabase = createClient();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 86400000);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Run all COUNT queries in parallel for efficiency
        const [totalResult, todayResult, weekResult, monthResult] = await Promise.all([
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .gte('start_time', today.toISOString())
            .lt('start_time', tomorrow.toISOString()),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .gte('start_time', weekStart.toISOString()),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .gte('start_time', monthStart.toISOString()),
        ]);

        return {
          total: totalResult.count ?? 0,
          today: todayResult.count ?? 0,
          thisWeek: weekResult.count ?? 0,
          thisMonth: monthResult.count ?? 0,
        };
      },
      CACHE_TTL.SHORT // 1 minute - stats change frequently
    );
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
    let eventsQuery = supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('space_id', spaceId)
      .is('deleted_at', null);

    // Search in title, description, and location (sanitized to prevent SQL injection)
    const sanitizedQuery = sanitizeSearchInput(query);
    if (sanitizedQuery) {
      eventsQuery = eventsQuery.or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%,location.ilike.%${sanitizedQuery}%`);
    }

    eventsQuery = eventsQuery.order('start_time', { ascending: true });
    const { data, error } = await eventsQuery;

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
  },

  // ==========================================
  // ENHANCED RECURRING EVENTS
  // ==========================================

  /**
   * Get events with enhanced recurring event support
   * This method generates recurring event occurrences dynamically
   * and can be used as a drop-in replacement for getEvents when you need recurring support
   */
  async getEventsWithRecurring(
    spaceId: string,
    startDate?: Date,
    endDate?: Date,
    includeDeleted = false
  ): Promise<CalendarEvent[]> {
    // Import the recurring events service here to avoid circular dependencies
    const { recurringEventsService } = await import('./recurring-events-service');

    // Default to current month if no date range provided
    if (!startDate) {
      startDate = new Date();
      startDate.setDate(1); // First day of current month
    }

    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 2); // Next 2 months
    }

    // Get events with recurring occurrences
    const events = await recurringEventsService.getEventsWithOccurrences(
      spaceId,
      startDate,
      endDate,
      includeDeleted
    );

    return events;
  },

  /**
   * Check if an event is a recurring event occurrence (virtual event)
   */
  isRecurringOccurrence(event: CalendarEvent): event is CalendarEvent & { series_id: string; occurrence_date: string } {
    return 'series_id' in event && 'occurrence_date' in event;
  },

  /**
   * Get the master event for a recurring occurrence
   */
  async getMasterEvent(eventOrOccurrence: CalendarEvent): Promise<CalendarEvent | null> {
    if (!this.isRecurringOccurrence(eventOrOccurrence)) {
      return eventOrOccurrence; // Already a master event
    }

    return this.getEventById(eventOrOccurrence.series_id);
  },

  /**
   * Enhanced recurring event management
   */
  recurring: {
    /**
     * Create a recurring event exception (modify single occurrence)
     */
    async createException(
      seriesId: string,
      occurrenceDate: string,
      modifications: Partial<CreateEventInput>
    ): Promise<CalendarEvent> {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.createException(seriesId, occurrenceDate, modifications);
    },

    /**
     * Delete a single occurrence
     */
    async deleteOccurrence(seriesId: string, occurrenceDate: string): Promise<void> {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.deleteOccurrence(seriesId, occurrenceDate);
    },

    /**
     * Update entire recurring series
     */
    async updateSeries(seriesId: string, updates: Partial<CreateEventInput>): Promise<CalendarEvent> {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.updateSeries(seriesId, updates);
    },

    /**
     * Update this and future occurrences (split series)
     */
    async updateFromDate(
      seriesId: string,
      fromDate: string,
      updates: Partial<CreateEventInput>
    ): Promise<CalendarEvent> {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.updateFromDate(seriesId, fromDate, updates);
    },

    /**
     * Parse simple recurrence pattern to enhanced format
     */
    async parsePattern(recurrence_pattern: string) {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.parseSimplePattern(recurrence_pattern);
    },

    /**
     * Convert enhanced pattern to simple format for storage
     */
    async serializePattern(pattern: EnhancedRecurrencePattern) {
      const { recurringEventsService } = await import('./recurring-events-service');
      return recurringEventsService.serializeToSimplePattern(pattern);
    }
  }
};
