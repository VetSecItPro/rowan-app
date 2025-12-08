// Phase 15: Important Dates Types
// Types for birthdays, anniversaries, and other recurring important dates

/**
 * Date types for categorization
 */
export type ImportantDateType =
  | 'birthday'
  | 'anniversary'
  | 'memorial'
  | 'renewal'
  | 'appointment'
  | 'custom';

/**
 * Emoji presets for each date type
 */
export const DATE_TYPE_EMOJIS: Record<ImportantDateType, string> = {
  birthday: '🎂',
  anniversary: '💕',
  memorial: '🕯️',
  renewal: '🔄',
  appointment: '📅',
  custom: '⭐',
};

/**
 * Color presets for each date type
 */
export const DATE_TYPE_COLORS: Record<ImportantDateType, string> = {
  birthday: 'pink',
  anniversary: 'red',
  memorial: 'purple',
  renewal: 'amber',
  appointment: 'blue',
  custom: 'indigo',
};

/**
 * Display labels for date types
 */
export const DATE_TYPE_LABELS: Record<ImportantDateType, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  memorial: 'Memorial',
  renewal: 'Renewal',
  appointment: 'Recurring Appointment',
  custom: 'Custom',
};

/**
 * Core important date record from database
 */
export interface ImportantDate {
  id: string;
  space_id: string;
  title: string;
  person_name: string | null;
  date_type: ImportantDateType;
  month: number; // 1-12
  day_of_month: number; // 1-31
  year_started: number | null;
  year_ended: number | null;
  emoji: string;
  color: string;
  notes: string | null;
  notify_days_before: number[];
  shopping_reminder_enabled: boolean;
  shopping_reminder_days_before: number;
  shopping_reminder_text: string | null;
  show_on_calendar: boolean;
  calendar_all_day: boolean;
  // Countdown integration fields
  show_on_countdown: boolean;
  countdown_days_before: number;
  countdown_label: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new important date
 */
export interface CreateImportantDateInput {
  space_id: string;
  title: string;
  person_name?: string;
  date_type: ImportantDateType;
  month: number;
  day_of_month: number;
  year_started?: number;
  year_ended?: number;
  emoji?: string;
  color?: string;
  notes?: string;
  notify_days_before?: number[];
  shopping_reminder_enabled?: boolean;
  shopping_reminder_days_before?: number;
  shopping_reminder_text?: string;
  show_on_calendar?: boolean;
  calendar_all_day?: boolean;
  // Countdown integration
  show_on_countdown?: boolean;
  countdown_days_before?: number;
  countdown_label?: string;
  created_by: string;
}

/**
 * Input for updating an important date
 */
export interface UpdateImportantDateInput {
  title?: string;
  person_name?: string | null;
  date_type?: ImportantDateType;
  month?: number;
  day_of_month?: number;
  year_started?: number | null;
  year_ended?: number | null;
  emoji?: string;
  color?: string;
  notes?: string | null;
  notify_days_before?: number[];
  shopping_reminder_enabled?: boolean;
  shopping_reminder_days_before?: number;
  shopping_reminder_text?: string | null;
  show_on_calendar?: boolean;
  calendar_all_day?: boolean;
  // Countdown integration
  show_on_countdown?: boolean;
  countdown_days_before?: number;
  countdown_label?: string | null;
  is_active?: boolean;
}

/**
 * Important date with calculated fields for display
 */
export interface ImportantDateWithMeta extends ImportantDate {
  /** Next occurrence date (ISO string) */
  next_occurrence: string;
  /** Days until next occurrence */
  days_until: number;
  /** Age or years (calculated from year_started) */
  years: number | null;
  /** Is the occurrence today? */
  is_today: boolean;
  /** Is the occurrence this week? */
  is_this_week: boolean;
}

/**
 * Query options for fetching important dates
 */
export interface ImportantDateQueryOptions {
  date_type?: ImportantDateType;
  is_active?: boolean;
  upcoming_days?: number; // Get dates occurring within X days
  limit?: number;
}

/**
 * Result from the important dates service
 */
export interface ImportantDatesResult {
  dates: ImportantDateWithMeta[];
  error: string | null;
}
