import { createClient } from '@/lib/supabase/client';
import { CalendarEvent } from './calendar-service';
import { addDays, addMinutes, format, parseISO, startOfDay } from 'date-fns';

export interface TimeSlot {
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  score: number;      // 0-100, higher is better
  label?: string;     // e.g., "Tuesday evening"
}

export interface FindTimeOptions {
  duration: number;           // minutes
  dateRange: {
    start: Date;
    end: Date;
  };
  preferredTimes?: TimeRange[];
  participants: string[];     // user IDs
  bufferBefore?: number;      // minutes
  bufferAfter?: number;       // minutes
  spaceId: string;
}

export interface TimeRange {
  dayOfWeek?: number;        // 0-6 (Sunday-Saturday), undefined = all days
  startTime: string;         // HH:MM format
  endTime: string;           // HH:MM format
}

export interface AvailabilityBlock {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: 'work' | 'sleep' | 'busy' | 'available';
  created_at: string;
}

export const DURATION_PRESETS = [
  { label: '15 min', value: 15, icon: '⚡' },
  { label: '30 min', value: 30, icon: '☕' },
  { label: '1 hour', value: 60, icon: '📅' },
  { label: '2 hours', value: 120, icon: '🎬' },
  { label: 'Half day', value: 240, icon: '🌅' },
  { label: 'Full day', value: 480, icon: '📆' }
];

/**
 * Smart scheduling service for finding optimal meeting times
 */
export const smartSchedulingService = {
  /**
   * Find optimal time slots for an event
   */
  async findOptimalTimeSlots(options: FindTimeOptions): Promise<TimeSlot[]> {
    const supabase = createClient();

    // 1. Get all events for the space in date range
    const { data: events, error } = await supabase
      .from('events')
      .select('id, space_id, title, description, start_time, end_time, event_type, is_recurring, recurrence_pattern, location, category, status, assigned_to, created_by, custom_color, timezone, deleted_at, deleted_by, show_countdown, countdown_label, linked_bill_id, created_at, updated_at')
      .eq('space_id', options.spaceId)
      .gte('start_time', options.dateRange.start.toISOString())
      .lte('start_time', options.dateRange.end.toISOString())
      .is('deleted_at', null);

    if (error) throw error;

    // 2. Get availability blocks for participants
    const { data: availabilityBlocks, error: availError } = await supabase
      .from('availability_blocks')
      .select('id, user_id, day_of_week, start_time, end_time, block_type, created_at')
      .in('user_id', options.participants);

    if (availError) throw availError;

    // 3. Build timeline and find available slots
    const availableSlots = this.findAvailableGaps(
      events || [],
      options,
      availabilityBlocks || []
    );

    // 4. Score slots based on preferences
    const scoredSlots = this.scoreTimeSlots(availableSlots, options);

    // 5. Return top 5 suggestions
    return scoredSlots.slice(0, 5);
  },

  /**
   * Find gaps in the calendar that fit the requested duration
   */
  findAvailableGaps(
    events: CalendarEvent[],
    options: FindTimeOptions,
    availabilityBlocks: AvailabilityBlock[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const { duration, bufferBefore = 0, bufferAfter = 0 } = options;
    const totalDuration = duration + bufferBefore + bufferAfter;

    // Iterate through each day in the range
    let currentDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dayStart = startOfDay(currentDate);

      // Get work hours for this day (default 9am-5pm)
      const workHoursBlocks = availabilityBlocks.filter(
        block => block.day_of_week === dayOfWeek && block.block_type !== 'busy'
      );

      // If no availability blocks, use default work hours (9am-9pm)
      const dayRanges = workHoursBlocks.length > 0
        ? workHoursBlocks.map(block => ({
            start: this.timeStringToDate(dayStart, block.start_time),
            end: this.timeStringToDate(dayStart, block.end_time)
          }))
        : [{
            start: this.timeStringToDate(dayStart, '09:00'),
            end: this.timeStringToDate(dayStart, '21:00')
          }];

      // Check each time range for this day
      for (const range of dayRanges) {
        let slotStart = new Date(range.start);

        // Move through the day in 30-minute increments
        while (slotStart < range.end) {
          const slotEnd = addMinutes(slotStart, totalDuration);

          // Check if slot end is within the day's range
          if (slotEnd > range.end) break;

          // Check if this slot conflicts with any existing events
          const hasConflict = events.some(event => {
            const eventStart = parseISO(event.start_time);
            const eventEnd = event.end_time ? parseISO(event.end_time) : addMinutes(eventStart, 60);

            return (
              (slotStart >= eventStart && slotStart < eventEnd) ||
              (slotEnd > eventStart && slotEnd <= eventEnd) ||
              (slotStart <= eventStart && slotEnd >= eventEnd)
            );
          });

          if (!hasConflict) {
            slots.push({
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              score: 0, // Will be scored later
              label: this.generateTimeLabel(slotStart)
            });
          }

          // Move to next 30-minute slot
          slotStart = addMinutes(slotStart, 30);
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return slots;
  },

  /**
   * Score time slots based on preferences
   */
  scoreTimeSlots(slots: TimeSlot[], options: FindTimeOptions): TimeSlot[] {
    return slots.map(slot => {
      let score = 50; // Base score
      const slotStart = parseISO(slot.start_time);
      const hour = slotStart.getHours();
      const dayOfWeek = slotStart.getDay();

      // Prefer business hours (9am-5pm)
      if (hour >= 9 && hour < 17) {
        score += 20;
      }

      // Prefer weekdays over weekends
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        score += 10;
      } else {
        score -= 10; // Penalize weekends
      }

      // Prefer afternoon over morning
      if (hour >= 13 && hour < 17) {
        score += 5;
      }

      // Match preferred times if specified
      if (options.preferredTimes && options.preferredTimes.length > 0) {
        const matchesPreferred = options.preferredTimes.some(range => {
          if (range.dayOfWeek !== undefined && range.dayOfWeek !== dayOfWeek) {
            return false;
          }

          const [prefStartHour, prefStartMin] = range.startTime.split(':').map(Number);
          const [prefEndHour, prefEndMin] = range.endTime.split(':').map(Number);
          const prefStart = prefStartHour * 60 + prefStartMin;
          const prefEnd = prefEndHour * 60 + prefEndMin;
          const slotMinutes = hour * 60 + slotStart.getMinutes();

          return slotMinutes >= prefStart && slotMinutes < prefEnd;
        });

        if (matchesPreferred) {
          score += 30;
        }
      }

      return {
        ...slot,
        score: Math.min(Math.max(score, 0), 100) // Clamp between 0-100
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
  },

  /**
   * Generate a human-readable label for a time slot
   */
  generateTimeLabel(date: Date): string {
    const dayName = format(date, 'EEEE');
    const time = format(date, 'h:mm a');
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isTomorrow = format(date, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if (isToday) {
      return `Today at ${time}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${time}`;
    } else {
      return `${dayName}, ${format(date, 'MMM d')} at ${time}`;
    }
  },

  /**
   * Convert time string (HH:MM) to Date on a specific day
   */
  timeStringToDate(baseDate: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  },

  /**
   * Create or update an availability block
   */
  async upsertAvailabilityBlock(block: Omit<AvailabilityBlock, 'id' | 'created_at'>): Promise<AvailabilityBlock> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('availability_blocks')
      .upsert([block], {
        onConflict: 'user_id,day_of_week,start_time'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get availability blocks for a user
   */
  async getAvailabilityBlocks(userId: string): Promise<AvailabilityBlock[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('availability_blocks')
      .select('id, user_id, day_of_week, start_time, end_time, block_type, created_at')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete an availability block
   */
  async deleteAvailabilityBlock(blockId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('availability_blocks')
      .delete()
      .eq('id', blockId);

    if (error) throw error;
  }
};
