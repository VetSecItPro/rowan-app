import { format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Timezone utility functions for normalizing all times to UTC in database
 * and displaying in user's local timezone
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
  const tz = timezone || getUserTimezone();
  const date = typeof localDate === 'string' ? parseISO(localDate) : localDate;

  // Convert from user's timezone to UTC
  const utcDate = fromZonedTime(date, tz);
  return utcDate.toISOString();
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
  const tz = timezone || getUserTimezone();
  const utcDate = parseISO(utcISOString);

  // Convert from UTC to user's timezone
  return toZonedTime(utcDate, tz);
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
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(parseISO(utcISOString), tz, formatString);
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

  // Show both timezones
  const localTime = formatInTimeZone(parseISO(utcISOString), userTz, 'h:mm a zzz');
  const eventTime = formatInTimeZone(parseISO(utcISOString), eventTimezone, 'h:mm a zzz');

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

  return formatInTimeZone(date, tz, 'zzz');
}

/**
 * Get timezone offset in hours (e.g., -8 for PST, -5 for EST)
 */
export function getTimezoneOffset(timezone?: string): number {
  const tz = timezone || getUserTimezone();
  const date = new Date();

  const offset = formatInTimeZone(date, tz, 'XXX'); // e.g., "-08:00"
  const [hours] = offset.split(':');
  return parseInt(hours, 10);
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

  if (!endTimeUTC) {
    return formatInTimeZone(parseISO(startTimeUTC), tz, FORMATS.TIME_12H);
  }

  const startTime = formatInTimeZone(parseISO(startTimeUTC), tz, FORMATS.TIME_12H);
  const endTime = formatInTimeZone(parseISO(endTimeUTC), tz, FORMATS.TIME_12H);

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

  const date = formatInTimeZone(parseISO(startTimeUTC), tz, FORMATS.DATE_MEDIUM);
  const time = formatEventTime(startTimeUTC, endTimeUTC, tz);

  return `${date} at ${time}`;
}
