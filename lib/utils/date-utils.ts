import { format, formatDistanceToNow } from 'date-fns';

/**
 * Parse a date-only string (YYYY-MM-DD) without timezone conversion.
 *
 * IMPORTANT: `new Date("2025-12-03")` interprets as UTC midnight, which becomes
 * Dec 2 at 7pm in CST (UTC-5). This function splits the string and creates
 * a local-timezone Date to avoid that shift.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

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
  return format(parseDateString(dateString), formatStr);
}

/**
 * Format a date-only string for display with a default format.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param formatStr - Format string for date-fns (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDateString(dateString: string, formatStr: string = 'MMM d, yyyy'): string {
  return format(parseDateString(dateString), formatStr);
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
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return format(date, formatStr);
}

/**
 * Format a UTC timestamp to show date and time in user's local timezone.
 * Convenience wrapper for common datetime display.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @returns Formatted datetime string (e.g., "Oct 9, 2025, 9:30 AM")
 */
export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return format(date, 'PPp');
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
 * Format a timestamp as relative time (e.g., "5 minutes ago", "2 hours ago").
 * Use for: notifications, activity feeds, recent updates, etc.
 *
 * @param timestamp - ISO 8601 timestamp string (stored in UTC)
 * @returns Relative time string (e.g., "5 minutes ago")
 *
 * @example
 * formatRelativeTime('2025-10-09T14:30:00Z') // "5 minutes ago"
 */
export function formatRelativeTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}
