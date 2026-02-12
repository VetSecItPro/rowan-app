// Event Mapper Service
// Phase 2: Bidirectional event format conversion between Rowan and external calendars

import type {
  RowanEventSnapshot,
  GoogleCalendarEvent,
  ParsedICalEvent,
  ExternalEventSnapshot,
} from '@/lib/types/calendar-integration';

// =============================================================================
// ROWAN → GOOGLE CALENDAR
// =============================================================================

export function mapRowanToGoogle(event: RowanEventSnapshot): Partial<GoogleCalendarEvent> {
  const startDateTime = event.start_time || '';
  const endDateTime = event.end_time || null;

  const isAllDay = event.all_day || (startDateTime && !startDateTime.includes('T'));

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start: isAllDay
      ? { date: startDateTime.split('T')[0] }
      : { dateTime: startDateTime, timeZone: event.timezone || 'UTC' },
    end: isAllDay
      ? { date: getEndDate(endDateTime || startDateTime).split('T')[0] }
      : {
          dateTime: endDateTime || addOneHour(startDateTime),
          timeZone: event.timezone || 'UTC',
        },
    colorId: mapRowanColorToGoogleColor(event.custom_color),
    recurrence: event.recurrence_pattern
      ? [`RRULE:${mapRowanRecurrenceToRRule(event.recurrence_pattern)}`]
      : undefined,
  };
}

// =============================================================================
// GOOGLE CALENDAR → ROWAN
// =============================================================================

export function mapGoogleToRowan(
  event: GoogleCalendarEvent,
  spaceId: string
): Record<string, unknown> {
  const isAllDay = !!event.start.date && !event.start.dateTime;

  // Map to actual database column names (start_time, end_time, custom_color)
  return {
    space_id: spaceId,
    title: event.summary || '(No title)',
    description: event.description || null,
    location: event.location || null,
    start_time: event.start.dateTime || event.start.date || new Date().toISOString(),
    end_time: event.end.dateTime || event.end.date || null,
    all_day: isAllDay,
    timezone: event.start.timeZone || null,
    status: mapGoogleStatusToRowan(event.status),
    category: null, // Google doesn't have categories
    custom_color: mapGoogleColorToRowanColor(event.colorId),
    recurrence_pattern: event.recurrence
      ? mapRRuleToRowanRecurrence(event.recurrence[0])
      : null,
    is_recurring: event.recurrence ? true : false,
    event_type: 'calendar',
    external_source: 'google',
  };
}

// =============================================================================
// ROWAN → ICALENDAR (CalDAV)
// =============================================================================

export function mapRowanToICalendar(event: RowanEventSnapshot): string {
  const uid = `${event.id}@rowan.app`;
  const dtstamp = formatICalDateTime(new Date().toISOString());
  const created = formatICalDateTime(event.created_at);
  const lastModified = formatICalDateTime(event.updated_at);

  const startTime = event.start_time || '';
  const endTime = event.end_time || null;

  const isAllDay = event.all_day || !startTime.includes('T');
  const dtstart = isAllDay
    ? `DTSTART;VALUE=DATE:${formatICalDate(startTime)}`
    : `DTSTART:${formatICalDateTime(startTime)}`;
  const dtend = isAllDay
    ? `DTEND;VALUE=DATE:${formatICalDate(endTime || startTime)}`
    : `DTEND:${formatICalDateTime(endTime || addOneHour(startTime))}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rowan App//Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    dtstart,
    dtend,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  if (event.recurrence_pattern) {
    lines.push(`RRULE:${mapRowanRecurrenceToRRule(event.recurrence_pattern)}`);
  }

  lines.push(
    `CREATED:${created}`,
    `LAST-MODIFIED:${lastModified}`,
    mapRowanStatusToICalStatus(event.status),
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

// =============================================================================
// ICALENDAR → ROWAN
// =============================================================================

export function mapICalendarToRowan(
  event: ParsedICalEvent,
  spaceId: string
): Partial<RowanEventSnapshot> {
  const isAllDay = !event.dtstart.includes('T');

  return {
    space_id: spaceId,
    title: event.summary || '(No title)',
    description: event.description || null,
    location: event.location || null,
    start_time: parseICalDateTime(event.dtstart),
    end_time: event.dtend ? parseICalDateTime(event.dtend) : null,
    all_day: isAllDay,
    timezone: null, // CalDAV timezones are complex, handle separately
    status: mapICalStatusToRowan(event.status),
    category: null,
    custom_color: null,
    recurrence_pattern: event.rrule
      ? mapRRuleToRowanRecurrence(event.rrule)
      : null,
  };
}

// =============================================================================
// EXTERNAL EVENT SNAPSHOT CREATION
// =============================================================================

export function createExternalSnapshot(
  event: GoogleCalendarEvent | ParsedICalEvent,
  _source: 'google' | 'apple' | 'cozi'
): ExternalEventSnapshot {
  if ('summary' in event && 'etag' in event) {
    // Google Calendar event
    const googleEvent = event as GoogleCalendarEvent;
    return {
      id: googleEvent.id,
      calendar_id: googleEvent.calendarId,
      title: googleEvent.summary,
      description: googleEvent.description || null,
      start: googleEvent.start.dateTime || googleEvent.start.date || '',
      end: googleEvent.end.dateTime || googleEvent.end.date || null,
      all_day: !!googleEvent.start.date,
      location: googleEvent.location || null,
      status: googleEvent.status,
      recurrence: googleEvent.recurrence?.[0] || null,
      etag: googleEvent.etag,
      updated: googleEvent.updated,
      organizer: googleEvent.organizer?.email || null,
      attendees: googleEvent.attendees?.map((a) => ({
        email: a.email,
        display_name: a.displayName || null,
        response_status: a.responseStatus,
        organizer: a.organizer || false,
        self: a.self || false,
      })) || null,
    };
  } else {
    // iCalendar event
    const icalEvent = event as ParsedICalEvent;
    return {
      id: icalEvent.uid,
      calendar_id: '', // Set by caller
      title: icalEvent.summary,
      description: icalEvent.description || null,
      start: parseICalDateTime(icalEvent.dtstart),
      end: icalEvent.dtend ? parseICalDateTime(icalEvent.dtend) : null,
      all_day: !icalEvent.dtstart.includes('T'),
      location: icalEvent.location || null,
      status: icalEvent.status?.toLowerCase() || null,
      recurrence: icalEvent.rrule || null,
      etag: null,
      updated: icalEvent.lastModified
        ? parseICalDateTime(icalEvent.lastModified)
        : new Date().toISOString(),
      organizer: icalEvent.organizer || null,
      attendees: icalEvent.attendees?.map((a) => ({
        email: a.email,
        display_name: a.cn || null,
        response_status: mapICalPartStatToResponseStatus(a.partstat),
        organizer: false,
        self: false,
      })) || null,
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS: DATE/TIME
// =============================================================================

function addOneHour(dateString: string): string {
  const date = new Date(dateString);
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

function getEndDate(dateString: string): string {
  // For all-day events, end date should be the next day
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function formatICalDateTime(dateString: string): string {
  // Convert ISO string to iCalendar format: 20231215T100000Z
  return dateString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatICalDate(dateString: string): string {
  // Convert to iCalendar date format: 20231215
  return dateString.split('T')[0].replace(/-/g, '');
}

function parseICalDateTime(icalDateTime: string): string {
  // Parse iCalendar datetime to ISO string
  if (icalDateTime.length === 8) {
    // Date only: 20231215
    return `${icalDateTime.slice(0, 4)}-${icalDateTime.slice(4, 6)}-${icalDateTime.slice(6, 8)}`;
  }

  // Full datetime: 20231215T100000Z or 20231215T100000
  const hasZ = icalDateTime.endsWith('Z');
  const clean = icalDateTime.replace('Z', '').replace('T', '');

  const year = clean.slice(0, 4);
  const month = clean.slice(4, 6);
  const day = clean.slice(6, 8);
  const hour = clean.slice(8, 10) || '00';
  const minute = clean.slice(10, 12) || '00';
  const second = clean.slice(12, 14) || '00';

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${hasZ ? 'Z' : ''}`;
}

// =============================================================================
// HELPER FUNCTIONS: COLOR MAPPING
// =============================================================================

const ROWAN_TO_GOOGLE_COLOR: Record<string, string> = {
  blue: '9',
  purple: '3',
  pink: '4',
  green: '10',
  emerald: '2',
  orange: '6',
  amber: '5',
  indigo: '1',
  red: '11',
  gray: '8',
};

function mapRowanColorToGoogleColor(color: string | null): string | undefined {
  if (!color) return undefined;
  return ROWAN_TO_GOOGLE_COLOR[color.toLowerCase()] || undefined;
}

function mapGoogleColorToRowanColor(colorId: string | undefined): string | null {
  if (!colorId) return null;

  const mapping: Record<string, string> = {
    '1': 'indigo',
    '2': 'emerald',
    '3': 'purple',
    '4': 'pink',
    '5': 'amber',
    '6': 'orange',
    '7': 'blue',
    '8': 'gray',
    '9': 'blue',
    '10': 'green',
    '11': 'red',
  };

  return mapping[colorId] || null;
}

// =============================================================================
// HELPER FUNCTIONS: STATUS MAPPING
// =============================================================================

function mapGoogleStatusToRowan(status: string): string {
  // Note: events table uses hyphens: 'not-started', 'in-progress', 'completed'
  switch (status) {
    case 'confirmed':
      return 'not-started';
    case 'tentative':
      return 'not-started';
    case 'cancelled':
      return 'completed'; // Treat cancelled as done
    default:
      return 'not-started';
  }
}

function mapRowanStatusToICalStatus(status: string | null): string {
  switch (status) {
    case 'completed':
      return 'STATUS:CANCELLED';
    case 'in_progress':
      return 'STATUS:CONFIRMED';
    default:
      return 'STATUS:CONFIRMED';
  }
}

function mapICalStatusToRowan(status: string | undefined): string {
  // Note: events table uses hyphens: 'not-started', 'in-progress', 'completed'
  switch (status?.toUpperCase()) {
    case 'CANCELLED':
      return 'completed';
    case 'TENTATIVE':
      return 'not-started';
    case 'CONFIRMED':
    default:
      return 'not-started';
  }
}

function mapICalPartStatToResponseStatus(
  partstat: string | undefined
): 'accepted' | 'declined' | 'tentative' | 'needsAction' {
  switch (partstat?.toUpperCase()) {
    case 'ACCEPTED':
      return 'accepted';
    case 'DECLINED':
      return 'declined';
    case 'TENTATIVE':
      return 'tentative';
    default:
      return 'needsAction';
  }
}

// =============================================================================
// HELPER FUNCTIONS: RECURRENCE
// =============================================================================

function mapRowanRecurrenceToRRule(pattern: string): string {
  // Convert Rowan patterns to iCalendar RRULE format
  const lowerPattern = pattern.toLowerCase();

  // Handle day-specific patterns like "weekly:5" (5 = Friday)
  if (lowerPattern.startsWith('weekly:')) {
    const dayNum = parseInt(lowerPattern.split(':')[1], 10);
    const dayMap: Record<number, string> = {
      0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA'
    };
    const byDay = dayMap[dayNum] || 'MO';
    return `FREQ=WEEKLY;BYDAY=${byDay}`;
  }

  switch (lowerPattern) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekly':
      return 'FREQ=WEEKLY';
    case 'biweekly':
      return 'FREQ=WEEKLY;INTERVAL=2';
    case 'monthly':
      return 'FREQ=MONTHLY';
    case 'yearly':
      return 'FREQ=YEARLY';
    default:
      // Already RRULE format or unknown - pass through
      if (lowerPattern.startsWith('freq=')) {
        return pattern.toUpperCase();
      }
      return 'FREQ=WEEKLY'; // Safe fallback
  }
}

function mapRRuleToRowanRecurrence(rrule: string): string {
  // Parse RRULE and convert to Rowan pattern
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  const byDayMatch = rrule.match(/BYDAY=(\w+)/);

  if (!freqMatch) return 'daily';

  const freq = freqMatch[1].toLowerCase();
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;

  if (freq === 'weekly' && interval === 2) {
    return 'biweekly';
  }

  // Handle weekly with specific day
  if (freq === 'weekly' && byDayMatch) {
    const dayMap: Record<string, number> = {
      'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
    };
    const dayNum = dayMap[byDayMatch[1].toUpperCase()];
    if (dayNum !== undefined) {
      return `weekly:${dayNum}`;
    }
  }

  return freq;
}

// =============================================================================
// HELPER FUNCTIONS: TEXT ESCAPING
// =============================================================================

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export const eventMapper = {
  // Rowan → External
  mapRowanToGoogle,
  mapRowanToICalendar,

  // External → Rowan
  mapGoogleToRowan,
  mapICalendarToRowan,

  // Snapshots
  createExternalSnapshot,
};
