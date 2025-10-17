import { format } from 'date-fns';

export function formatInTimezone(
  utcDate: string,
  timezone: string,
  formatStr: string = 'MMM d, yyyy h:mm a'
): string {
  const date = new Date(utcDate);
  return format(date, formatStr);
}

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
