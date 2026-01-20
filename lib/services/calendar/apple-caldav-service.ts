// Apple CalDAV Service
// Phase 3: CalDAV protocol implementation for Apple Calendar sync

import { createDAVClient, DAVCalendar, DAVObject, DAVClient } from 'tsdav';
import { createClient } from '@/lib/supabase/server';
import { eventMapper } from './event-mapper';
import { logger } from '@/lib/logger';
import type {
  CalDAVEvent,
  CalDAVCalendar,
  ParsedICalEvent,
  RowanEventSnapshot,
} from '@/lib/types/calendar-integration';

// =============================================================================
// CONFIGURATION
// =============================================================================

const APPLE_CALDAV_SERVER = 'https://caldav.icloud.com';

// =============================================================================
// CLIENT FACTORY
// =============================================================================

interface AppleCredentials {
  email: string;
  app_specific_password: string;
}

async function getCredentials(connectionId: string): Promise<AppleCredentials> {
  const supabase = await createClient();

  // Get email from connection
  const { data: connection, error: connectionError } = await supabase
    .from('calendar_connections')
    .select('provider_account_id')
    .eq('id', connectionId)
    .single();

  if (connectionError || !connection?.provider_account_id) {
    throw new Error('Connection not found or missing account ID');
  }

  // Get password from vault
  const { data: password, error: passwordError } = await supabase.rpc('get_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'app_specific_password',
  });

  if (passwordError || !password) {
    throw new Error('Failed to retrieve app-specific password');
  }

  return {
    email: connection.provider_account_id,
    app_specific_password: password,
  };
}

async function createCalDAVClient(credentials: AppleCredentials): Promise<DAVClient> {
  const client = await createDAVClient({
    serverUrl: APPLE_CALDAV_SERVER,
    credentials: {
      username: credentials.email,
      password: credentials.app_specific_password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  // Cast to DAVClient - createDAVClient returns a compatible type
  return client as unknown as DAVClient;
}

async function getAuthenticatedClient(connectionId: string): Promise<DAVClient> {
  const credentials = await getCredentials(connectionId);
  return createCalDAVClient(credentials);
}

// =============================================================================
// CREDENTIAL STORAGE
// =============================================================================

export async function storeAppleCredentials(
  connectionId: string,
  email: string,
  appSpecificPassword: string
): Promise<void> {
  const supabase = await createClient();

  // Store app-specific password in vault
  const { error: passwordError } = await supabase.rpc('store_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'app_specific_password',
    p_token_value: appSpecificPassword,
    p_description: 'Apple Calendar app-specific password',
  });

  if (passwordError) {
    logger.error('Failed to store app-specific password:', passwordError, { component: 'lib-apple-caldav-service', action: 'service_call' });
    throw new Error('Failed to store credentials securely');
  }

  // Update connection with email (account ID)
  const { error: updateError } = await supabase
    .from('calendar_connections')
    .update({
      provider_account_id: email,
      sync_status: 'active',
    })
    .eq('id', connectionId);

  if (updateError) {
    logger.error('Failed to update connection:', updateError, { component: 'lib-apple-caldav-service', action: 'service_call' });
    throw new Error('Failed to update connection');
  }
}

// =============================================================================
// CREDENTIAL VALIDATION
// =============================================================================

export async function validateAppleCredentials(
  email: string,
  appSpecificPassword: string
): Promise<{ valid: boolean; calendars?: CalDAVCalendar[]; error?: string }> {
  try {
    const client = await createCalDAVClient({ email, app_specific_password: appSpecificPassword });

    // Try to fetch calendars to validate credentials
    const calendars = await client.fetchCalendars();

    if (!calendars || calendars.length === 0) {
      return {
        valid: false,
        error: 'No calendars found. Please make sure you have at least one calendar in iCloud.',
      };
    }

    return {
      valid: true,
      calendars: calendars.map(mapDAVCalendar),
    };
  } catch (error) {
    logger.error('Apple CalDAV validation error:', error, { component: 'lib-apple-caldav-service', action: 'service_call' });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for common authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return {
        valid: false,
        error: 'Invalid credentials. Please check your email and app-specific password.',
      };
    }

    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return {
        valid: false,
        error: 'Access denied. You may need to generate a new app-specific password.',
      };
    }

    return {
      valid: false,
      error: `Connection failed: ${errorMessage}`,
    };
  }
}

// =============================================================================
// CALENDAR OPERATIONS
// =============================================================================

export async function listCalendars(connectionId: string): Promise<CalDAVCalendar[]> {
  const client = await getAuthenticatedClient(connectionId);
  const calendars = await client.fetchCalendars();

  return calendars.map(mapDAVCalendar);
}

export async function getEvents(
  connectionId: string,
  options: {
    calendarUrl?: string;
    timeMin?: string;
    timeMax?: string;
    syncToken?: string;
  } = {}
): Promise<{ events: CalDAVEvent[]; nextSyncToken?: string }> {
  const client = await getAuthenticatedClient(connectionId);

  // Get calendars if specific URL not provided
  const calendars = options.calendarUrl
    ? [{ url: options.calendarUrl }]
    : await client.fetchCalendars();

  if (!calendars || calendars.length === 0) {
    return { events: [] };
  }

  // Fetch events from the primary or first calendar
  const calendar = calendars[0];

  // Set default time range: past 7 days to 90 days future
  const timeMin = options.timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = options.timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const calendarObjects = await client.fetchCalendarObjects({
    calendar: calendar as DAVCalendar,
    timeRange: {
      start: timeMin,
      end: timeMax,
    },
  });

  const events: CalDAVEvent[] = calendarObjects.map((obj: DAVObject) => ({
    url: obj.url,
    etag: obj.etag || '',
    data: obj.data || '',
    calendarData: obj.data ? parseICalendar(obj.data) : undefined,
  }));

  // For CalDAV, we use the calendar's ctag as a sync token
  const ctag = (calendar as DAVCalendar).ctag;

  return {
    events,
    nextSyncToken: ctag,
  };
}

export async function getEventsDelta(
  connectionId: string,
  calendarUrl: string,
  syncToken: string
): Promise<{ events: CalDAVEvent[]; deleted: string[]; nextSyncToken?: string }> {
  const client = await getAuthenticatedClient(connectionId);

  // Fetch calendar to get current ctag
  const calendars = await client.fetchCalendars();
  const calendar = calendars.find((c: DAVCalendar) => c.url === calendarUrl);

  if (!calendar) {
    throw new Error('Calendar not found');
  }

  const currentCtag = (calendar as DAVCalendar).ctag;

  // If ctag hasn't changed, no updates needed
  if (currentCtag === syncToken) {
    return { events: [], deleted: [], nextSyncToken: currentCtag };
  }

  // CalDAV doesn't support true delta sync like Google
  // We need to fetch all events and compare with previous state
  // For now, we'll do a full sync when ctag changes
  const { events } = await getEvents(connectionId, { calendarUrl });

  return {
    events,
    deleted: [], // Would need to track previous event UIDs to determine deletions
    nextSyncToken: currentCtag,
  };
}

export async function createEvent(
  connectionId: string,
  event: RowanEventSnapshot,
  calendarUrl?: string
): Promise<CalDAVEvent> {
  const client = await getAuthenticatedClient(connectionId);

  const calendars = await client.fetchCalendars();
  const calendar = calendarUrl
    ? calendars.find((c: DAVCalendar) => c.url === calendarUrl)
    : calendars[0];

  if (!calendar) {
    throw new Error('Calendar not found');
  }

  const iCalData = eventMapper.mapRowanToICalendar(event);
  const uid = `${event.id}@rowan.app`;

  const result = await client.createCalendarObject({
    calendar: calendar as DAVCalendar,
    filename: `${uid}.ics`,
    iCalString: iCalData,
  });

  // Extract etag from result - tsdav returns Response with url
  const resultObj = result as unknown as { url?: string; etag?: string };
  return {
    url: resultObj.url || `${calendar.url}${uid}.ics`,
    etag: resultObj.etag || '',
    data: iCalData,
    calendarData: parseICalendar(iCalData),
  };
}

export async function updateEvent(
  connectionId: string,
  eventUrl: string,
  event: RowanEventSnapshot,
  etag?: string
): Promise<CalDAVEvent> {
  const client = await getAuthenticatedClient(connectionId);

  const iCalData = eventMapper.mapRowanToICalendar(event);

  await client.updateCalendarObject({
    calendarObject: {
      url: eventUrl,
      etag: etag || '',
      data: iCalData,
    },
  });

  return {
    url: eventUrl,
    etag: '', // Would need to fetch to get new etag
    data: iCalData,
    calendarData: parseICalendar(iCalData),
  };
}

export async function deleteEvent(
  connectionId: string,
  eventUrl: string,
  etag?: string
): Promise<void> {
  const client = await getAuthenticatedClient(connectionId);

  await client.deleteCalendarObject({
    calendarObject: {
      url: eventUrl,
      etag: etag || '',
    },
  });
}

export async function getEvent(
  connectionId: string,
  eventUrl: string
): Promise<CalDAVEvent | null> {
  const client = await getAuthenticatedClient(connectionId);

  try {
    const calendars = await client.fetchCalendars();

    // Find the calendar that contains this event
    for (const calendar of calendars) {
      const objects = await client.fetchCalendarObjects({
        calendar: calendar as DAVCalendar,
        objectUrls: [eventUrl],
      });

      if (objects && objects.length > 0) {
        const obj = objects[0];
        return {
          url: obj.url,
          etag: obj.etag || '',
          data: obj.data || '',
          calendarData: obj.data ? parseICalendar(obj.data) : undefined,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to get event:', error, { component: 'lib-apple-caldav-service', action: 'service_call' });
    return null;
  }
}

// =============================================================================
// ICALENDAR PARSING
// =============================================================================

function parseICalendar(icalData: string): ParsedICalEvent | undefined {
  try {
    const lines = icalData.split(/\r?\n/);
    const event: Partial<ParsedICalEvent> = {};

    let inVEvent = false;
    let currentLine = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle line continuation (lines starting with space or tab)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        currentLine += line.slice(1);
        continue;
      }

      // Process the previous complete line
      if (currentLine) {
        processICalLine(currentLine, event, inVEvent);
      }

      currentLine = line;

      if (line === 'BEGIN:VEVENT') {
        inVEvent = true;
      } else if (line === 'END:VEVENT') {
        inVEvent = false;
      }
    }

    // Process the last line
    if (currentLine) {
      processICalLine(currentLine, event, inVEvent);
    }

    if (!event.uid || !event.dtstart) {
      return undefined;
    }

    return event as ParsedICalEvent;
  } catch (error) {
    logger.error('Failed to parse iCalendar:', error, { component: 'lib-apple-caldav-service', action: 'service_call' });
    return undefined;
  }
}

function processICalLine(
  line: string,
  event: Partial<ParsedICalEvent>,
  inVEvent: boolean
): void {
  if (!inVEvent) return;

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return;

  const fieldPart = line.substring(0, colonIndex);
  const value = unescapeICalText(line.substring(colonIndex + 1));

  // Parse field name and parameters
  const semicolonIndex = fieldPart.indexOf(';');
  const fieldName = semicolonIndex === -1 ? fieldPart : fieldPart.substring(0, semicolonIndex);

  switch (fieldName.toUpperCase()) {
    case 'UID':
      event.uid = value;
      break;
    case 'SUMMARY':
      event.summary = value;
      break;
    case 'DESCRIPTION':
      event.description = value;
      break;
    case 'LOCATION':
      event.location = value;
      break;
    case 'DTSTART':
      event.dtstart = value;
      break;
    case 'DTEND':
      event.dtend = value;
      break;
    case 'DTSTAMP':
      event.dtstamp = value;
      break;
    case 'RRULE':
      event.rrule = value;
      break;
    case 'RECURRENCE-ID':
      event.recurrenceId = value;
      break;
    case 'STATUS':
      event.status = value.toUpperCase() as 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
      break;
    case 'LAST-MODIFIED':
      event.lastModified = value;
      break;
    case 'CREATED':
      event.created = value;
      break;
    case 'SEQUENCE':
      event.sequence = parseInt(value, 10);
      break;
    case 'ORGANIZER':
      // Extract email from "mailto:email@domain.com" or just use value
      event.organizer = value.replace(/^mailto:/i, '');
      break;
  }
}

function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function mapDAVCalendar(calendar: DAVCalendar): CalDAVCalendar {
  return {
    url: calendar.url,
    displayName: typeof calendar.displayName === 'string' ? calendar.displayName : 'Calendar',
    ctag: typeof calendar.ctag === 'string' ? calendar.ctag : '',
    syncToken: calendar.syncToken,
    description: typeof calendar.description === 'string' ? calendar.description : undefined,
    timezone: typeof calendar.timezone === 'string' ? calendar.timezone : undefined,
    color: undefined, // tsdav doesn't expose color directly
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const appleCalDAVService = {
  // Credentials
  validateAppleCredentials,
  storeAppleCredentials,

  // Calendar operations
  listCalendars,
  getEvents,
  getEventsDelta,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,

  // Parsing
  parseICalendar,
};
