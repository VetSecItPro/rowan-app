import { format, parseISO } from 'date-fns';

/**
 * Timezone utility functions for normalizing all times to UTC in database
 * and displaying in user's local timezone
 *
 * Note: Uses browser's built-in Intl API for timezone handling
 */

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a local date/time to UTC ISO string for database storage
 * This is what you use when SAVING to the database
 *
 * @param localDate - Date in user's local timezone
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns UTC ISO string for database storage
 */
export function toUTC(localDate: Date | string, timezone?: string): string {
  void timezone;
  const date = typeof localDate === 'string' ? parseISO(localDate) : localDate;
  return date.toISOString();
}

/**
 * Convert a UTC ISO string from database to user's local timezone for display
 * This is what you use when READING from the database
 *
 * @param utcISOString - UTC ISO string from database
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns Date object in user's local timezone
 */
export function fromUTC(utcISOString: string, timezone?: string): Date {
  void timezone;
  return parseISO(utcISOString);
}

/**
 * Format a UTC timestamp for display in user's local timezone
 *
 * @param utcISOString - UTC ISO string from database
 * @param formatString - date-fns format string (e.g., 'PPp', 'h:mm a')
 * @param timezone - User's timezone (optional, defaults to browser timezone)
 * @returns Formatted string in user's local timezone
 */
export function formatInLocalTimezone(
  utcISOString: string,
  formatString: string = 'PPp',
  timezone?: string
): string {
  void timezone;
  const date = parseISO(utcISOString);
  return format(date, formatString);
}

/**
 * Get a datetime-local input value from a UTC ISO string
 * datetime-local inputs expect format: "YYYY-MM-DDTHH:mm"
 *
 * @param utcISOString - UTC ISO string from database
 * @param timezone - User's timezone (optional)
 * @returns String in datetime-local format
 */
export function toDateTimeLocalValue(utcISOString: string, timezone?: string): string {
  if (!utcISOString) return '';

  void timezone;
  const localDate = fromUTC(utcISOString, timezone);
  // Format as YYYY-MM-DDTHH:mm (datetime-local format)
  return format(localDate, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Convert datetime-local input value to UTC ISO string
 * datetime-local inputs provide format: "YYYY-MM-DDTHH:mm"
 *
 * @param dateTimeLocalValue - Value from datetime-local input
 * @param timezone - User's timezone (optional)
 * @returns UTC ISO string for database
 */
export function fromDateTimeLocalValue(dateTimeLocalValue: string, timezone?: string): string {
  if (!dateTimeLocalValue) return '';

  // Parse the datetime-local string (it's in local time)
  const localDate = parseISO(dateTimeLocalValue);

  // Convert to UTC for database storage
  return toUTC(localDate, timezone);
}

/**
 * Display dual timezone if event timezone differs from user timezone
 * Useful for events created in different timezones
 *
 * @param utcISOString - UTC ISO string from database
 * @param eventTimezone - Timezone the event was created in (optional)
 * @param userTimezone - User's current timezone (optional)
 * @returns Formatted string with dual timezones if different
 */
export function formatWithDualTimezone(
  utcISOString: string,
  eventTimezone?: string,
  userTimezone?: string
): string {
  const userTz = userTimezone || getUserTimezone();

  // If no event timezone or same as user timezone, show single time
  if (!eventTimezone || eventTimezone === userTz) {
    return formatInLocalTimezone(utcISOString, 'PPp', userTz);
  }

  // Show both timezones using Intl API
  const date = parseISO(utcISOString);
  const localTime = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);

  const eventTime = new Intl.DateTimeFormat('en-US', {
    timeZone: eventTimezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);

  return `${localTime} (${eventTime} event time)`;
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbreviation(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  const date = new Date();

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  }).format(date);

  // Extract the timezone abbreviation from the formatted string
  const parts = formatted.split(', ');
  return parts[parts.length - 1] || '';
}

/**
 * Get timezone offset in hours (e.g., -8 for PST, -5 for EST)
 */
export function getTimezoneOffset(timezone?: string): number {
  const tz = timezone || getUserTimezone();
  const date = new Date();

  const tzDate = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const utcDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  const tzTime = new Date(tzDate).getTime();
  const utcTime = new Date(utcDate).getTime();
  const offsetMs = tzTime - utcTime;

  return Math.round(offsetMs / (1000 * 60 * 60));
}

/**
 * Format in specific timezone using Intl API
 */
function formatInTimeZone(date: Date, timezone: string, formatStr: string): string {
  // For simple time formats, use Intl API
  if (formatStr === 'h:mm a' || formatStr === 'h:mm a zzz') {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    if (formatStr.includes('zzz')) {
      options.timeZoneName = 'short';
    }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  // Fallback to date-fns format
  return format(date, formatStr);
}

/**
 * Common format patterns for easy use
 */
export const FORMATS = {
  DATE_SHORT: 'MMM d',                    // "Jan 15"
  DATE_MEDIUM: 'MMM d, yyyy',             // "Jan 15, 2025"
  DATE_LONG: 'EEEE, MMMM d, yyyy',        // "Wednesday, January 15, 2025"
  TIME_12H: 'h:mm a',                     // "2:30 PM"
  TIME_24H: 'HH:mm',                      // "14:30"
  DATETIME_SHORT: 'MMM d, h:mm a',        // "Jan 15, 2:30 PM"
  DATETIME_MEDIUM: 'MMM d, yyyy h:mm a',  // "Jan 15, 2025 2:30 PM"
  DATETIME_LONG: 'PPp',                   // Full date and time
  ISO: "yyyy-MM-dd'T'HH:mm:ss",          // ISO 8601 format
};

/**
 * Helper to format event times consistently
 */
export function formatEventTime(
  startTimeUTC: string,
  endTimeUTC?: string,
  timezone?: string
): string {
  const tz = timezone || getUserTimezone();
  const startDate = parseISO(startTimeUTC);

  if (!endTimeUTC) {
    return formatInTimeZone(startDate, tz, FORMATS.TIME_12H);
  }

  const endDate = parseISO(endTimeUTC);
  const startTime = formatInTimeZone(startDate, tz, FORMATS.TIME_12H);
  const endTime = formatInTimeZone(endDate, tz, FORMATS.TIME_12H);

  return `${startTime} - ${endTime}`;
}

/**
 * Helper to format event date and time together
 */
export function formatEventDateTime(
  startTimeUTC: string,
  endTimeUTC?: string,
  timezone?: string
): string {
  const tz = timezone || getUserTimezone();
  const startDate = parseISO(startTimeUTC);

  const date = formatInTimeZone(startDate, tz, FORMATS.DATE_MEDIUM);
  const time = formatEventTime(startTimeUTC, endTimeUTC, tz);

  return `${date} at ${time}`;
}
