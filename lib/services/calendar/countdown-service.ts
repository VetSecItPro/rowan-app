// Countdown Service
// Phase 11: Manages event countdowns for dashboard display

import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent } from '@/lib/services/calendar-service';

/**
 * Countdown item with calculated time remaining
 */
export interface CountdownItem {
  id: string;
  event: CalendarEvent;
  label: string;
  targetDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  isToday: boolean;
  isPast: boolean;
  formattedCountdown: string;
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
function eventToCountdown(event: CalendarEvent): CountdownItem {
  const targetDate = new Date(event.start_time);
  const { days, hours, minutes, isToday, isPast } = calculateTimeRemaining(targetDate);

  return {
    id: event.id,
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

export const countdownService = {
  /**
   * Get active countdowns for a space
   * Returns future events with show_countdown enabled, sorted by date
   */
  async getActiveCountdowns(spaceId: string, limit: number = 5): Promise<CountdownResult> {
    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('space_id', spaceId)
        .eq('show_countdown', true)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[CountdownService] Error fetching countdowns:', error);
        return { countdowns: [], error: 'Failed to fetch countdowns' };
      }

      const countdowns = (events || []).map(eventToCountdown);

      return { countdowns };
    } catch (error) {
      console.error('[CountdownService] Unexpected error:', error);
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
        .select('*')
        .eq('space_id', spaceId)
        .eq('show_countdown', true)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[CountdownService] Error fetching today countdowns:', error);
        return { countdowns: [], error: 'Failed to fetch today countdowns' };
      }

      const countdowns = (events || []).map(eventToCountdown);

      return { countdowns };
    } catch (error) {
      console.error('[CountdownService] Unexpected error:', error);
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
        console.error('[CountdownService] Error toggling countdown:', error);
        return { success: false, error: 'Failed to update countdown settings' };
      }

      return { success: true };
    } catch (error) {
      console.error('[CountdownService] Unexpected error:', error);
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
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        return null;
      }

      return eventToCountdown(event);
    } catch (error) {
      console.error('[CountdownService] Error fetching event countdown:', error);
      return null;
    }
  },
};
