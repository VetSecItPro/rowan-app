import { format, parseISO } from 'date-fns';

/**
 * Format a date-only string (yyyy-MM-dd) without timezone conversion.
 * Use for: check-in dates, goal target dates, milestone dates, etc.
 *
 * @param dateString - Date string in yyyy-MM-dd format
 * @param formatStr - date-fns format string
 * @returns Formatted date string
 *
 * @example
 * formatDate('2025-10-09', 'EEEE, MMMM d, yyyy') // "Thursday, October 9, 2025"
 */
export function formatDate(dateString: string, formatStr: string): string {
  return format(parseISO(dateString), formatStr);
}

/**
 * Format a UTC timestamp with automatic conversion to user's local timezone.
 * Use for: created_at, updated_at, event times, reminder times, message timestamps, etc.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @param formatStr - date-fns format string
 * @returns Formatted timestamp in user's local timezone
 *
 * @example
 * formatTimestamp('2025-10-09T14:30:00Z', 'PPp') // "Oct 9, 2025, 9:30 AM" (EST)
 */
export function formatTimestamp(timestamp: string, formatStr: string): string {
  return format(new Date(timestamp), formatStr);
}

/**
 * Format a UTC timestamp to show date and time in user's local timezone.
 * Convenience wrapper for common datetime display.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @returns Formatted datetime string (e.g., "Oct 9, 2025, 9:30 AM")
 */
export function formatDateTime(timestamp: string): string {
  return format(new Date(timestamp), 'PPp');
}

/**
 * Format a UTC timestamp to show only the time in user's local timezone.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export function formatTime(timestamp: string): string {
  return format(new Date(timestamp), 'p');
}

/**
 * Format a UTC timestamp to show only the date in user's local timezone.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @returns Formatted date string (e.g., "Oct 9, 2025")
 */
export function formatTimestampDate(timestamp: string): string {
  return format(new Date(timestamp), 'PP');
}

/**
 * Get the current date as a string (yyyy-MM-dd) in user's local timezone.
 * Use for: creating new check-ins, setting target dates, etc.
 *
 * @returns Current date string in yyyy-MM-dd format
 */
export function getCurrentDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Convert a date string to a Date object for comparisons.
 * Handles timezone-neutral parsing for date-only strings.
 *
 * @param dateString - Date string in yyyy-MM-dd format
 * @returns Date object
 */
export function parseDateString(dateString: string): Date {
  return parseISO(dateString);
}
