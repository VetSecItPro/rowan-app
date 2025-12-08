// Phase 15: Important Dates Service
// Service for managing birthdays, anniversaries, and recurring important dates

import { createClient } from '@/lib/supabase/client';
import type {
  ImportantDate,
  ImportantDateWithMeta,
  CreateImportantDateInput,
  UpdateImportantDateInput,
  ImportantDateQueryOptions,
  ImportantDatesResult,
} from '@/lib/types/important-dates';

/**
 * Calculate the next occurrence of a recurring date
 */
function getNextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Create date for this year
  let nextDate = new Date(currentYear, month - 1, day);

  // If the date has passed this year, use next year
  if (nextDate < now) {
    // But check if it's today (hasn't fully passed)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkDate = new Date(currentYear, month - 1, day);
    if (checkDate.getTime() !== today.getTime()) {
      nextDate = new Date(currentYear + 1, month - 1, day);
    }
  }

  return nextDate;
}

/**
 * Calculate days until a target date
 */
function getDaysUntil(targetDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate years/age from a starting year
 */
function calculateYears(yearStarted: number | null, month: number, day: number): number | null {
  if (!yearStarted) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  let years = currentYear - yearStarted;

  // If birthday/anniversary hasn't occurred yet this year, subtract 1
  if (month > currentMonth || (month === currentMonth && day > currentDay)) {
    years -= 1;
  }

  // For the upcoming occurrence, add 1 to show "turning X"
  // Actually, show what age/year they ARE or WILL BE at next occurrence
  const nextOcc = getNextOccurrence(month, day);
  years = nextOcc.getFullYear() - yearStarted;

  return years;
}

/**
 * Enrich an ImportantDate with calculated metadata
 */
function enrichWithMeta(date: ImportantDate): ImportantDateWithMeta {
  const nextOccurrence = getNextOccurrence(date.month, date.day_of_month);
  const daysUntil = getDaysUntil(nextOccurrence);
  const years = calculateYears(date.year_started, date.month, date.day_of_month);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  return {
    ...date,
    next_occurrence: nextOccurrence.toISOString(),
    days_until: daysUntil,
    years,
    is_today: daysUntil === 0,
    is_this_week: daysUntil >= 0 && daysUntil <= 7,
  };
}

/**
 * Important Dates Service
 * Handles CRUD operations and queries for important dates
 */
export const importantDatesService = {
  /**
   * Get all important dates for a space
   */
  async getImportantDates(
    spaceId: string,
    options?: ImportantDateQueryOptions
  ): Promise<ImportantDatesResult> {
    const supabase = createClient();

    try {
      let query = supabase
        .from('important_dates')
        .select('*')
        .eq('space_id', spaceId);

      // Apply filters
      if (options?.date_type) {
        query = query.eq('date_type', options.date_type);
      }

      if (options?.is_active !== undefined) {
        query = query.eq('is_active', options.is_active);
      } else {
        // Default to active only
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('month').order('day_of_month');

      if (error) {
        console.error('Error fetching important dates:', error);
        return { dates: [], error: error.message };
      }

      // Enrich with metadata and sort by upcoming
      let enrichedDates: ImportantDateWithMeta[] = (data || []).map(enrichWithMeta);

      // Filter by upcoming days if specified
      if (options?.upcoming_days !== undefined) {
        enrichedDates = enrichedDates.filter(
          (d: ImportantDateWithMeta) => d.days_until >= 0 && d.days_until <= options.upcoming_days!
        );
      }

      // Sort by days until (nearest first)
      enrichedDates.sort((a: ImportantDateWithMeta, b: ImportantDateWithMeta) => a.days_until - b.days_until);

      // Apply limit
      if (options?.limit) {
        enrichedDates = enrichedDates.slice(0, options.limit);
      }

      return { dates: enrichedDates, error: null };
    } catch (err) {
      console.error('Error in getImportantDates:', err);
      return { dates: [], error: 'Failed to fetch important dates' };
    }
  },

  /**
   * Get upcoming important dates (for widget display)
   */
  async getUpcomingDates(
    spaceId: string,
    days: number = 30,
    limit: number = 5
  ): Promise<ImportantDatesResult> {
    return this.getImportantDates(spaceId, {
      is_active: true,
      upcoming_days: days,
      limit,
    });
  },

  /**
   * Get a single important date by ID
   */
  async getImportantDateById(id: string): Promise<ImportantDateWithMeta | null> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('important_dates')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return enrichWithMeta(data);
    } catch (err) {
      console.error('Error in getImportantDateById:', err);
      return null;
    }
  },

  /**
   * Create a new important date
   */
  async createImportantDate(input: CreateImportantDateInput): Promise<ImportantDateWithMeta | null> {
    const supabase = createClient();

    try {
      // Set smart defaults for countdown_days_before based on date type
      const defaultCountdownDays = {
        birthday: 30,
        anniversary: 14,
        memorial: 7,
        renewal: 14,
        appointment: 7,
        custom: 14,
      };

      const { data, error } = await supabase
        .from('important_dates')
        .insert({
          space_id: input.space_id,
          title: input.title,
          person_name: input.person_name || null,
          date_type: input.date_type,
          month: input.month,
          day_of_month: input.day_of_month,
          year_started: input.year_started || null,
          year_ended: input.year_ended || null,
          emoji: input.emoji || '🎂',
          color: input.color || 'pink',
          notes: input.notes || null,
          notify_days_before: input.notify_days_before || [7, 1, 0],
          shopping_reminder_enabled: input.shopping_reminder_enabled || false,
          shopping_reminder_days_before: input.shopping_reminder_days_before || 7,
          shopping_reminder_text: input.shopping_reminder_text || null,
          show_on_calendar: input.show_on_calendar !== false,
          calendar_all_day: input.calendar_all_day !== false,
          // Countdown integration - smart defaults
          show_on_countdown: input.show_on_countdown !== false,
          countdown_days_before: input.countdown_days_before || defaultCountdownDays[input.date_type] || 14,
          countdown_label: input.countdown_label || null,
          created_by: input.created_by,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating important date:', error);
        return null;
      }

      return enrichWithMeta(data);
    } catch (err) {
      console.error('Error in createImportantDate:', err);
      return null;
    }
  },

  /**
   * Update an important date
   */
  async updateImportantDate(
    id: string,
    updates: UpdateImportantDateInput
  ): Promise<ImportantDateWithMeta | null> {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('important_dates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating important date:', error);
        return null;
      }

      return enrichWithMeta(data);
    } catch (err) {
      console.error('Error in updateImportantDate:', err);
      return null;
    }
  },

  /**
   * Delete an important date
   */
  async deleteImportantDate(id: string): Promise<boolean> {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('important_dates')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting important date:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteImportantDate:', err);
      return false;
    }
  },

  /**
   * Toggle active status of an important date
   */
  async toggleActive(id: string, isActive: boolean): Promise<ImportantDateWithMeta | null> {
    return this.updateImportantDate(id, { is_active: isActive });
  },

  /**
   * Get dates that need shopping reminders created
   * (Used by cron job or background task)
   */
  async getDatesNeedingShoppingReminders(
    spaceId: string
  ): Promise<ImportantDateWithMeta[]> {
    const result = await this.getImportantDates(spaceId, { is_active: true });

    if (result.error) {
      return [];
    }

    // Filter to dates with shopping reminders enabled
    // and within the reminder window
    return result.dates.filter((date) => {
      if (!date.shopping_reminder_enabled) return false;
      return date.days_until === date.shopping_reminder_days_before;
    });
  },

  /**
   * Get dates occurring today (for notifications)
   */
  async getTodaysDates(spaceId: string): Promise<ImportantDateWithMeta[]> {
    const result = await this.getImportantDates(spaceId, { is_active: true });

    if (result.error) {
      return [];
    }

    return result.dates.filter((date) => date.is_today);
  },
};

export type { ImportantDate, ImportantDateWithMeta, CreateImportantDateInput, UpdateImportantDateInput };
