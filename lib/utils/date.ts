/**
 * Date utility functions
 */
import { format } from 'date-fns';

/**
 * Parse a DATE string (YYYY-MM-DD) from the database without timezone conversion
 *
 * When we use `new Date("2025-12-03")`, JavaScript interprets it as UTC midnight,
 * which becomes Dec 2 at 7pm in CST (UTC-5). This function parses the date
 * as a local date to avoid timezone issues.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseDateString(dateString: string): Date {
  // Split the date string into parts
  const [year, month, day] = dateString.split('-').map(Number);

  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Format a DATE string for display
 * @param dateString - Date string in YYYY-MM-DD format
 * @param formatStr - Format string for date-fns
 * @returns Formatted date string
 */
export function formatDateString(dateString: string, formatStr: string = 'MMM d, yyyy'): string {
  return format(parseDateString(dateString), formatStr);
}
