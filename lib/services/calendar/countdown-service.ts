// Countdown Service
// Phase 11 + Phase 15: Manages unified countdowns from events AND important dates

import { createClient } from '@/lib/supabase/client';
import type { ImportantDate, ImportantDateType } from '@/lib/types/important-dates';
import { logger } from '@/lib/logger';

/**
 * Row type for the `calendar_events` table (lightweight countdown/important-date links).
 * NOT the same as CalendarEvent in calendar-service.ts which maps to the `events` table.
 */
export interface CalendarCountdownEvent {
  id: string;
  space_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  all_day?: boolean;
  location?: string | null;
  created_by?: string | null;
  show_countdown?: boolean;
  countdown_label?: string | null;
  important_date_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Source type for countdown items
 */
export type CountdownSource = 'event' | 'important_date';

/**
 * Countdown item with calculated time remaining
 * Unified type supporting both calendar events and important dates
 */
export interface CountdownItem {
  id: string;
  source: CountdownSource;
  event?: CalendarCountdownEvent;
  importantDate?: ImportantDate;
  label: string;
  targetDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  isToday: boolean;
  isPast: boolean;
  formattedCountdown: string;
  // Additional fields for important dates
  emoji?: string;
  dateType?: ImportantDateType;
  years?: number | null;
}

/**
 * Result from fetching countdowns
 */
export interface CountdownResult {
  countdowns: CountdownItem[];
  error?: string;
}

/**
 * Calculate time remaining until a target date
 */
function calculateTimeRemaining(targetDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  isToday: boolean;
  isPast: boolean;
} {
  const now = new Date();
  const target = new Date(targetDate);

  // Set both to start of day for day comparison
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.floor((targetStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24));

  const isPast = diffMs < 0;
  const isToday = diffDays === 0;

  // For positive countdown
  const absDiffMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absDiffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, isToday, isPast };
}

/**
 * Format the countdown for display
 */
function formatCountdown(
  days: number,
  hours: number,
  minutes: number,
  isToday: boolean,
  isPast: boolean
): string {
  if (isPast) {
    return 'Event passed';
  }

  if (isToday) {
    if (hours === 0 && minutes === 0) {
      return 'Now!';
    }
    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${minutes}m`;
  }

  if (days === 1) {
    return 'Tomorrow';
  }

  if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    if (remainingDays === 0) {
      return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
    return `${weeks}w ${remainingDays}d`;
  }

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  if (remainingDays === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  return `${months}mo ${remainingDays}d`;
}

/**
 * Transform an event into a countdown item
 */
function eventToCountdown(event: CalendarCountdownEvent): CountdownItem {
  const targetDate = new Date(event.start_time);
  const { days, hours, minutes, isToday, isPast } = calculateTimeRemaining(targetDate);

  return {
    id: event.id,
    source: 'event',
    event,
    label: event.countdown_label || event.title,
    targetDate,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    isToday,
    isPast,
    formattedCountdown: formatCountdown(days, hours, minutes, isToday, isPast),
  };
}

/**
 * Calculate the next occurrence of a recurring date (for important dates)
 */
function getNextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date for this year
  let nextDate = new Date(currentYear, month - 1, day);

  // If the date has passed this year, use next year
  if (nextDate < now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkDate = new Date(currentYear, month - 1, day);
    if (checkDate.getTime() !== today.getTime()) {
      nextDate = new Date(currentYear + 1, month - 1, day);
    }
  }

  return nextDate;
}

/**
 * Calculate years/age from a starting year
 */
function calculateYears(yearStarted: number | null, month: number, day: number): number | null {
  if (!yearStarted) return null;

  const nextOcc = getNextOccurrence(month, day);
  return nextOcc.getFullYear() - yearStarted;
}

/**
 * Transform an important date into a countdown item
 */
function importantDateToCountdown(date: ImportantDate): CountdownItem {
  const targetDate = getNextOccurrence(date.month, date.day_of_month);
  const { days, hours, minutes, isToday, isPast } = calculateTimeRemaining(targetDate);
  const years = calculateYears(date.year_started, date.month, date.day_of_month);

  // Build display label
  let label = date.countdown_label || date.person_name || date.title;
  if (date.date_type === 'birthday' && years !== null) {
    label = `${label} turns ${years}`;
  } else if (date.date_type === 'anniversary' && years !== null) {
    label = `${label} (${years} years)`;
  }

  return {
    id: `important_date_${date.id}`,
    source: 'important_date',
    importantDate: date,
    label,
    targetDate,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    isToday,
    isPast,
    formattedCountdown: formatCountdown(days, hours, minutes, isToday, isPast),
    emoji: date.emoji,
    dateType: date.date_type,
    years,
  };
}

/** Service for managing unified countdowns from both calendar events and important dates. */
export const countdownService = {
  /**
   * Get active countdowns for a space (UNIFIED)
   * Aggregates from both calendar events AND important dates
   * Returns items sorted by days remaining, limited to max items
   */
  async getActiveCountdowns(spaceId: string, limit: number = 6): Promise<CountdownResult> {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      // Fetch calendar events with show_countdown enabled
      const eventsPromise = supabase
        .from('calendar_events')
        .select('id, space_id, title, description, start_time, end_time, all_day, location, created_by, show_countdown, countdown_label, important_date_id, created_at, updated_at')
        .eq('space_id', spaceId)
        .eq('show_countdown', true)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(limit * 2); // Fetch more, we'll merge and limit later

      // Fetch important dates with show_on_countdown enabled
      const importantDatesPromise = supabase
        .from('important_dates')
        .select('id, space_id, title, person_name, date_type, month, day_of_month, year_started, year_ended, emoji, color, notes, notify_days_before, shopping_reminder_enabled, shopping_reminder_days_before, shopping_reminder_text, show_on_calendar, calendar_all_day, show_on_countdown, countdown_days_before, countdown_label, linked_calendar_event_id, is_active, created_by, created_at, updated_at')
        .eq('space_id', spaceId)
        .eq('show_on_countdown', true)
        .eq('is_active', true);

      const [eventsResult, importantDatesResult] = await Promise.all([
        eventsPromise,
        importantDatesPromise,
      ]);

      if (eventsResult.error) {
        logger.error('[CountdownService] Error fetching events:', undefined, { component: 'lib-countdown-service', action: 'service_call', details: eventsResult.error });
      }

      if (importantDatesResult.error) {
        logger.error('[CountdownService] Error fetching important dates:', undefined, { component: 'lib-countdown-service', action: 'service_call', details: importantDatesResult.error });
      }

      // Transform events to countdown items
      const eventCountdowns: CountdownItem[] = (eventsResult.data || []).map(eventToCountdown);

      // Transform important dates to countdown items (only if within countdown window)
      const importantDateCountdowns: CountdownItem[] = (importantDatesResult.data || [])
        .map((date: ImportantDate) => {
          const countdown = importantDateToCountdown(date);
          // Only include if within the countdown_days_before window
          if (countdown.daysRemaining <= date.countdown_days_before && !countdown.isPast) {
            return countdown;
          }
          return null;
        })
        .filter((c: CountdownItem | null): c is CountdownItem => c !== null);

      // Merge and sort by days remaining (closest first)
      const allCountdowns = [...eventCountdowns, ...importantDateCountdowns]
        .filter((c) => !c.isPast)
        .sort((a, b) => {
          // Sort by days remaining, then by hours/minutes for same-day items
          if (a.daysRemaining !== b.daysRemaining) {
            return a.daysRemaining - b.daysRemaining;
          }
          return a.hoursRemaining * 60 + a.minutesRemaining - (b.hoursRemaining * 60 + b.minutesRemaining);
        })
        .slice(0, limit);

      return { countdowns: allCountdowns };
    } catch (error) {
      logger.error('[CountdownService] Unexpected error:', error, { component: 'lib-countdown-service', action: 'service_call' });
      return { countdowns: [], error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get today's countdowns (events happening today)
   */
  async getTodayCountdowns(spaceId: string): Promise<CountdownResult> {
    try {
      const supabase = createClient();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('id, space_id, title, description, start_time, end_time, all_day, location, created_by, show_countdown, countdown_label, important_date_id, created_at, updated_at')
        .eq('space_id', spaceId)
        .eq('show_countdown', true)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('[CountdownService] Error fetching today countdowns:', error, { component: 'lib-countdown-service', action: 'service_call' });
        return { countdowns: [], error: 'Failed to fetch today countdowns' };
      }

      const countdowns = (events || []).map(eventToCountdown);

      return { countdowns };
    } catch (error) {
      logger.error('[CountdownService] Unexpected error:', error, { component: 'lib-countdown-service', action: 'service_call' });
      return { countdowns: [], error: 'An unexpected error occurred' };
    }
  },

  /**
   * Toggle countdown display for an event
   */
  async toggleCountdown(
    eventId: string,
    showCountdown: boolean,
    countdownLabel?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      const updateData: { show_countdown: boolean; countdown_label?: string | null } = {
        show_countdown: showCountdown,
      };

      if (countdownLabel !== undefined) {
        updateData.countdown_label = countdownLabel || null;
      }

      const { error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId);

      if (error) {
        logger.error('[CountdownService] Error toggling countdown:', error, { component: 'lib-countdown-service', action: 'service_call' });
        return { success: false, error: 'Failed to update countdown settings' };
      }

      return { success: true };
    } catch (error) {
      logger.error('[CountdownService] Unexpected error:', error, { component: 'lib-countdown-service', action: 'service_call' });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get countdown for a specific event
   */
  async getEventCountdown(eventId: string): Promise<CountdownItem | null> {
    try {
      const supabase = createClient();

      const { data: event, error } = await supabase
        .from('calendar_events')
        .select('id, space_id, title, description, start_time, end_time, all_day, location, created_by, show_countdown, countdown_label, important_date_id, created_at, updated_at')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        return null;
      }

      return eventToCountdown(event);
    } catch (error) {
      logger.error('[CountdownService] Error fetching event countdown:', error, { component: 'lib-countdown-service', action: 'service_call' });
      return null;
    }
  },
};
