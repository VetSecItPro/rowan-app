import { format, toZonedTime } from 'date-fns-tz';

export function formatInTimezone(
  utcDate: string,
  timezone: string,
  formatStr: string = 'MMM d, yyyy h:mm a'
): string {
  const zonedDate = toZonedTime(utcDate, timezone);
  return format(zonedDate, formatStr, { timeZone: timezone });
}

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
