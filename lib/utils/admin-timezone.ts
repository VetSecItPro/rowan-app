/**
 * Admin Timezone Utilities
 *
 * Per CLAUDE.md: "All cron jobs, scheduled tasks, and time references →
 * Central Time (America/Chicago) ONLY."
 *
 * The admin dashboard's "today / yesterday / this week" boundaries must be
 * computed in CT, not UTC. Otherwise after 7pm CT the dashboard rolls "today"
 * to UTC tomorrow, surprising the operator.
 *
 * date-fns-tz is NOT in the dependency tree, so we use the platform-native
 * Intl.DateTimeFormat to compute CT calendar parts, then re-assemble into a
 * Date that anchors to that CT day boundary.
 */

const ADMIN_TIMEZONE = 'America/Chicago';

interface CalendarParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extract the calendar parts (Y/M/D/h/m/s) of `date` as observed in the
 * admin timezone (America/Chicago).
 */
function getPartsInAdminTz(date: Date): CalendarParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ADMIN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // `hour: '2-digit', hour12: false` can emit '24' for midnight on some
    // engines — normalize to 0.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Returns the YYYY-MM-DD calendar date in America/Chicago for `date`.
 * Used for "today" date-string comparisons (e.g. signups-today filter).
 */
export function getAdminDateString(date: Date = new Date()): string {
  const { year, month, day } = getPartsInAdminTz(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns the UTC ISO instant corresponding to 00:00:00.000 of the given
 * CT calendar date. Pass a Date to anchor on its CT calendar day.
 *
 * Algorithm: take the CT calendar parts, then subtract the offset between
 * "the instant when CT clock reads those parts" and "the instant when UTC
 * clock reads those parts." Two-pass refinement handles DST cleanly.
 */
export function getAdminStartOfDayIso(date: Date = new Date()): string {
  const { year, month, day } = getPartsInAdminTz(date);
  // First pass: assume the CT-clock midnight equals UTC midnight (wrong by
  // ~5-6h depending on DST, but a starting point).
  const naiveUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Find what CT clock would read at that UTC instant.
  const observed = getPartsInAdminTz(new Date(naiveUtc));
  // Compute offset (ms) between target CT-clock midnight and observed CT clock.
  const observedAsUtc = Date.UTC(
    observed.year,
    observed.month - 1,
    observed.day,
    observed.hour,
    observed.minute,
    observed.second,
    0,
  );
  const offsetMs = observedAsUtc - naiveUtc;
  // Subtract that offset to land on the actual UTC instant of CT 00:00.
  return new Date(naiveUtc - offsetMs).toISOString();
}

/**
 * Returns the UTC ISO instant for 23:59:59.999 of the same CT calendar day.
 */
export function getAdminEndOfDayIso(date: Date = new Date()): string {
  const startIso = getAdminStartOfDayIso(date);
  const endMs = new Date(startIso).getTime() + 24 * 60 * 60 * 1000 - 1;
  return new Date(endMs).toISOString();
}
