import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent, CreateEventInput } from './calendar-service';

/**
 * Enhanced Recurring Events Service
 *
 * Handles advanced recurring event patterns, backwards compatible with existing simple patterns.
 * Based on the task recurrence system but adapted for calendar events.
 */

export interface EnhancedRecurrencePattern {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every X days/weeks/months/years
  days_of_week?: number[]; // 0-6, Sunday=0
  day_of_month?: number; // 1-31
  week_of_month?: number[]; // [1,3] = 1st and 3rd week
  month?: number; // 1-12
  end_date?: string; // ISO date string
  end_count?: number; // End after X occurrences
  exceptions?: string[]; // ISO date strings to skip
}

export interface RecurringEventInstance extends CalendarEvent {
  series_id: string; // ID of the master recurring event
  occurrence_date: string; // ISO date of this occurrence
  occurrence_index: number; // 0-based index in the series
  is_exception?: boolean; // True if this is a modified occurrence
}

export const recurringEventsService = {
  /**
   * Parse existing simple patterns into enhanced format
   * Maintains backward compatibility with current format:
   * - "daily" -> { pattern: 'daily', interval: 1 }
   * - "weekly:1,3,5" -> { pattern: 'weekly', interval: 1, days_of_week: [1,3,5] }
   * - "monthly:1,15" -> { pattern: 'monthly', interval: 1, day_of_month: [1,15] }
   */
  parseSimplePattern(recurrence_pattern: string): EnhancedRecurrencePattern | null {
    if (!recurrence_pattern) return null;

    if (recurrence_pattern === 'daily') {
      return {
        pattern: 'daily',
        interval: 1
      };
    }

    if (recurrence_pattern.startsWith('weekly:')) {
      const daysStr = recurrence_pattern.split(':')[1];
      const days = daysStr ? daysStr.split(',').map(Number).filter(n => n >= 0 && n <= 6) : [];
      return {
        pattern: 'weekly',
        interval: 1,
        days_of_week: days
      };
    }

    if (recurrence_pattern.startsWith('monthly:')) {
      const daysStr = recurrence_pattern.split(':')[1];
      const days = daysStr ? daysStr.split(',').map(Number).filter(n => n >= 1 && n <= 31) : [];
      // For now, treat monthly as selecting first day only for day_of_month
      // More sophisticated UI can handle multiple days later
      return {
        pattern: 'monthly',
        interval: 1,
        day_of_month: days[0] || 1
      };
    }

    return null;
  },

  /**
   * Convert enhanced pattern back to simple format for storage
   * This maintains compatibility with existing UI
   */
  serializeToSimplePattern(pattern: EnhancedRecurrencePattern): string {
    switch (pattern.pattern) {
      case 'daily':
        return 'daily';

      case 'weekly':
        if (pattern.days_of_week && pattern.days_of_week.length > 0) {
          return `weekly:${pattern.days_of_week.sort((a, b) => a - b).join(',')}`;
        }
        return 'weekly:';

      case 'monthly':
        if (pattern.day_of_month) {
          return `monthly:${pattern.day_of_month}`;
        }
        return 'monthly:1';

      case 'yearly':
        // Simple pattern doesn't support yearly, so store as enhanced JSON
        return JSON.stringify(pattern);

      default:
        return JSON.stringify(pattern);
    }
  },

  /**
   * Generate recurring event instances for a date range.
   * This is the core algorithm that creates virtual event occurrences.
   *
   * Algorithm:
   * 1. Parse recurrence pattern (try JSON first, fall back to simple format)
   * 2. Start from event's original date, walk forward in time
   * 3. For each date, check if it matches the pattern (daily/weekly/monthly/yearly)
   * 4. Skip dates that are exceptions (user deleted single occurrence)
   * 5. Create virtual instances with synthetic IDs (masterId-index)
   * 6. Stop when hitting maxOccurrences, end_count, or end_date
   *
   * Virtual IDs: We don't store every occurrence in DB. Instead, generate
   * them on-the-fly. Virtual ID format: `{masterId}-{occurrenceIndex}`
   *
   * Time preservation: Original event's time-of-day is preserved for each occurrence.
   * Duration is calculated once and applied to each instance.
   */
  generateOccurrences(
    masterEvent: CalendarEvent,
    startDate: Date,
    endDate: Date,
    maxOccurrences: number = 100
  ): RecurringEventInstance[] {
    if (!masterEvent.is_recurring || !masterEvent.recurrence_pattern) {
      return [];
    }

    // Parse the recurrence pattern (supports both JSON and simple string formats)
    let pattern: EnhancedRecurrencePattern | null;
    try {
      pattern = JSON.parse(masterEvent.recurrence_pattern);
    } catch {
      pattern = this.parseSimplePattern(masterEvent.recurrence_pattern);
    }

    if (!pattern) return [];

    const occurrences: RecurringEventInstance[] = [];
    const eventStart = new Date(masterEvent.start_time);
    let currentDate = new Date(eventStart);
    let occurrenceIndex = 0;

    // Pre-calculate duration so each occurrence has correct end time
    const duration = masterEvent.end_time
      ? new Date(masterEvent.end_time).getTime() - eventStart.getTime()
      : 0;

    // Walk through dates until we hit a stopping condition
    while (occurrences.length < maxOccurrences && currentDate <= endDate) {
      if (this.shouldGenerateOccurrence(currentDate, pattern, eventStart)) {
        // Only include occurrences within the requested date range
        if (currentDate >= startDate) {
          const occurrenceDate = currentDate.toISOString().split('T')[0];

          // Skip if this date is in the exceptions list (deleted occurrence)
          if (!pattern.exceptions?.includes(occurrenceDate)) {
            // Preserve time-of-day from original event
            const occurrenceStart = new Date(currentDate);
            occurrenceStart.setHours(eventStart.getHours());
            occurrenceStart.setMinutes(eventStart.getMinutes());
            occurrenceStart.setSeconds(eventStart.getSeconds());

            let occurrenceEnd: string | undefined;
            if (duration > 0) {
              occurrenceEnd = new Date(occurrenceStart.getTime() + duration).toISOString();
            }

            const occurrence: RecurringEventInstance = {
              ...masterEvent,
              id: `${masterEvent.id}-${occurrenceIndex}`, // Virtual ID for this occurrence
              series_id: masterEvent.id,
              occurrence_date: occurrenceDate,
              occurrence_index: occurrenceIndex,
              start_time: occurrenceStart.toISOString(),
              end_time: occurrenceEnd,
              is_exception: false
            };

            occurrences.push(occurrence);
          }
        }

        occurrenceIndex++;

        // Stop if we've generated the specified number of occurrences
        if (pattern.end_count && occurrenceIndex >= pattern.end_count) {
          break;
        }

        // Stop if we've passed the end date for the recurrence
        if (pattern.end_date && currentDate >= new Date(pattern.end_date)) {
          break;
        }
      }

      // Move to next candidate date
      currentDate = this.calculateNextDate(currentDate, pattern);
      if (!currentDate) break;
    }

    return occurrences;
  },

  /**
   * Check if an occurrence should be generated for a specific date
   */
  shouldGenerateOccurrence(
    date: Date,
    pattern: EnhancedRecurrencePattern,
    originalStart: Date
  ): boolean {
    switch (pattern.pattern) {
      case 'daily':
        // Every N days from original start
        const daysDiff = Math.floor((date.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000));
        return daysDiff >= 0 && daysDiff % pattern.interval === 0;

      case 'weekly':
        if (pattern.days_of_week && pattern.days_of_week.length > 0) {
          const dayOfWeek = date.getDay();
          if (!pattern.days_of_week.includes(dayOfWeek)) {
            return false;
          }
        }

        // Every N weeks from original start
        const weeksDiff = Math.floor((date.getTime() - originalStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return weeksDiff >= 0 && weeksDiff % pattern.interval === 0;

      case 'monthly':
        // Check day of month
        if (pattern.day_of_month && date.getDate() !== pattern.day_of_month) {
          return false;
        }

        // Check week of month (e.g., 1st and 3rd Friday)
        if (pattern.week_of_month && pattern.days_of_week) {
          const weekOfMonth = Math.ceil(date.getDate() / 7);
          const dayOfWeek = date.getDay();

          if (!pattern.week_of_month.includes(weekOfMonth) ||
              !pattern.days_of_week.includes(dayOfWeek)) {
            return false;
          }
        }

        // Every N months from original start
        const monthsDiff = (date.getFullYear() - originalStart.getFullYear()) * 12 +
                          (date.getMonth() - originalStart.getMonth());
        return monthsDiff >= 0 && monthsDiff % pattern.interval === 0;

      case 'yearly':
        // Check month
        if (pattern.month && date.getMonth() + 1 !== pattern.month) {
          return false;
        }

        // Check day of month
        if (pattern.day_of_month && date.getDate() !== pattern.day_of_month) {
          return false;
        }

        // Every N years from original start
        const yearsDiff = date.getFullYear() - originalStart.getFullYear();
        return yearsDiff >= 0 && yearsDiff % pattern.interval === 0;

      default:
        return false;
    }
  },

  /**
   * Calculate the next date to check for occurrence generation
   */
  calculateNextDate(
    currentDate: Date,
    pattern: EnhancedRecurrencePattern
  ): Date {
    const next = new Date(currentDate);

    switch (pattern.pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;

      case 'weekly':
        // If specific days of week, advance by 1 day, otherwise by interval weeks
        if (pattern.days_of_week && pattern.days_of_week.length > 0) {
          next.setDate(next.getDate() + 1);
        } else {
          next.setDate(next.getDate() + 7 * pattern.interval);
        }
        break;

      case 'monthly':
        if (pattern.week_of_month || pattern.days_of_week) {
          // For complex monthly patterns, advance by day and let shouldGenerate filter
          next.setDate(next.getDate() + 1);
        } else {
          // Simple monthly, advance by month
          next.setMonth(next.getMonth() + pattern.interval);
        }
        break;

      case 'yearly':
        if (pattern.month || pattern.day_of_month) {
          // For specific dates, advance by day and let shouldGenerate filter
          next.setDate(next.getDate() + 1);
        } else {
          // Simple yearly
          next.setFullYear(next.getFullYear() + pattern.interval);
        }
        break;

      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  },

  /**
   * Get recurring events with their occurrences in a date range
   * This integrates with the existing calendar service
   */
  async getEventsWithOccurrences(
    spaceId: string,
    startDate: Date,
    endDate: Date,
    includeDeleted = false
  ): Promise<(CalendarEvent | RecurringEventInstance)[]> {
    const supabase = createClient();

    // Get all events (including recurring masters)
    // FIX-308: Add limit to prevent unbounded query
    let query = supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('space_id', spaceId);

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data: events, error } = await query
      .order('start_time', { ascending: true })
      .limit(1000);

    if (error) throw error;

    const allEvents: (CalendarEvent | RecurringEventInstance)[] = [];

    for (const event of events || []) {
      if (event.is_recurring) {
        // Generate occurrences for recurring events
        const occurrences = this.generateOccurrences(event, startDate, endDate);
        allEvents.push(...occurrences);
      } else {
        // Add non-recurring events that fall within the date range
        const eventDate = new Date(event.start_time);
        if (eventDate >= startDate && eventDate <= endDate) {
          allEvents.push(event);
        }
      }
    }

    // Sort by start time
    return allEvents.sort((a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  },

  /**
   * Create a recurring event exception (modify single occurrence)
   * This stores the exception as a separate event record
   */
  async createException(
    seriesId: string,
    occurrenceDate: string,
    modifications: Partial<CreateEventInput>
  ): Promise<CalendarEvent> {
    const supabase = createClient();

    // Get the master event
    const { data: masterEvent, error: masterError } = await supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('id', seriesId)
      .single();

    if (masterError) throw masterError;

    // Create exception event
    const exceptionEvent: CreateEventInput = {
      ...masterEvent,
      ...modifications,
      is_recurring: false, // Exception is not recurring
      recurrence_pattern: undefined,
    };

    const { data, error } = await supabase
      .from('events')
      .insert(exceptionEvent)
      .select()
      .single();

    if (error) throw error;

    // Add the exception date to the master event's pattern
    let pattern: EnhancedRecurrencePattern;
    try {
      pattern = JSON.parse(masterEvent.recurrence_pattern);
    } catch {
      pattern = this.parseSimplePattern(masterEvent.recurrence_pattern) || {
        pattern: 'weekly',
        interval: 1
      };
    }

    pattern.exceptions = pattern.exceptions || [];
    if (!pattern.exceptions.includes(occurrenceDate)) {
      pattern.exceptions.push(occurrenceDate);
    }

    // Update master event with new exceptions
    await supabase
      .from('events')
      .update({
        recurrence_pattern: JSON.stringify(pattern)
      })
      .eq('id', seriesId);

    return data;
  },

  /**
   * Delete a single occurrence (add to exceptions)
   */
  async deleteOccurrence(seriesId: string, occurrenceDate: string): Promise<void> {
    const supabase = createClient();

    // Get the master event
    const { data: masterEvent, error: masterError } = await supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('id', seriesId)
      .single();

    if (masterError) throw masterError;

    // Parse and update pattern with exception
    let pattern: EnhancedRecurrencePattern;
    try {
      pattern = JSON.parse(masterEvent.recurrence_pattern);
    } catch {
      pattern = this.parseSimplePattern(masterEvent.recurrence_pattern) || {
        pattern: 'weekly',
        interval: 1
      };
    }

    pattern.exceptions = pattern.exceptions || [];
    if (!pattern.exceptions.includes(occurrenceDate)) {
      pattern.exceptions.push(occurrenceDate);
    }

    // Update master event
    const { error } = await supabase
      .from('events')
      .update({
        recurrence_pattern: JSON.stringify(pattern)
      })
      .eq('id', seriesId);

    if (error) throw error;
  },

  /**
   * Update entire recurring series
   */
  async updateSeries(
    seriesId: string,
    updates: Partial<CreateEventInput>
  ): Promise<CalendarEvent> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', seriesId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update this and future occurrences (split series)
   */
  async updateFromDate(
    seriesId: string,
    fromDate: string,
    updates: Partial<CreateEventInput>
  ): Promise<CalendarEvent> {
    const supabase = createClient();

    // Get the master event
    const { data: masterEvent, error: masterError } = await supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('id', seriesId)
      .single();

    if (masterError) throw masterError;

    // End the current series at the day before fromDate
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() - 1);

    let pattern: EnhancedRecurrencePattern;
    try {
      pattern = JSON.parse(masterEvent.recurrence_pattern);
    } catch {
      pattern = this.parseSimplePattern(masterEvent.recurrence_pattern) || {
        pattern: 'weekly',
        interval: 1
      };
    }

    // Update original series with end date
    pattern.end_date = endDate.toISOString().split('T')[0];

    await supabase
      .from('events')
      .update({
        recurrence_pattern: JSON.stringify(pattern)
      })
      .eq('id', seriesId);

    // Create new series starting from fromDate
    const newSeriesData: CreateEventInput = {
      ...masterEvent,
      ...updates,
      start_time: fromDate,
    };

    const { data: newSeries, error: newError } = await supabase
      .from('events')
      .insert(newSeriesData)
      .select()
      .single();

    if (newError) throw newError;
    return newSeries;
  }
};
