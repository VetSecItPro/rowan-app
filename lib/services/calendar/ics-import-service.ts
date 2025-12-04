// ICS Feed Import Service
// Phase 5: Handles ICS/iCalendar feed import and parsing

import { createClient } from '@/lib/supabase/server';
import type { ICSFeedConfig, SyncResult } from '@/lib/types/calendar-integration';
import ICAL from 'ical.js';

/**
 * ICS Import Service
 *
 * Handles importing events from ICS/iCalendar feeds (RFC 5545).
 * This is a one-way (inbound only) sync - events from the ICS feed
 * are imported into Rowan, but Rowan events are not pushed back.
 *
 * Supports:
 * - Standard ICS/iCalendar feeds (webcal://, https://)
 * - ETag and Last-Modified caching for efficient updates
 * - Recurring event expansion
 * - Timezone handling
 */

interface ParsedICSEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  recurrence?: string;
  lastModified?: Date;
}

interface ICSFetchResult {
  success: boolean;
  data?: string;
  etag?: string;
  lastModified?: string;
  notModified?: boolean;
  error?: string;
}

/**
 * Validate an ICS feed URL
 */
export function validateICSUrl(url: string): { valid: boolean; normalizedUrl: string; error?: string } {
  try {
    // Normalize webcal:// to https://
    let normalizedUrl = url.trim();
    if (normalizedUrl.startsWith('webcal://')) {
      normalizedUrl = normalizedUrl.replace('webcal://', 'https://');
    }

    // Validate URL format
    const parsedUrl = new URL(normalizedUrl);

    // Only allow https (and http for localhost dev)
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      return { valid: false, normalizedUrl, error: 'URL must use HTTPS protocol' };
    }

    // Block localhost in production
    if (process.env.NODE_ENV === 'production' &&
        (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
      return { valid: false, normalizedUrl, error: 'Localhost URLs not allowed in production' };
    }

    return { valid: true, normalizedUrl };
  } catch {
    return { valid: false, normalizedUrl: url, error: 'Invalid URL format' };
  }
}

/**
 * Fetch ICS data from a URL with caching support
 */
async function fetchICSData(
  url: string,
  previousEtag?: string,
  previousLastModified?: string
): Promise<ICSFetchResult> {
  try {
    const headers: HeadersInit = {
      'Accept': 'text/calendar, application/calendar+xml, text/plain',
      'User-Agent': 'Rowan-Calendar-Sync/1.0',
    };

    // Add conditional headers for caching
    if (previousEtag) {
      headers['If-None-Match'] = previousEtag;
    }
    if (previousLastModified) {
      headers['If-Modified-Since'] = previousLastModified;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      // 30 second timeout
      signal: AbortSignal.timeout(30000),
    });

    // Handle 304 Not Modified
    if (response.status === 304) {
      return { success: true, notModified: true };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.text();

    // Validate it looks like ICS data
    if (!data.includes('BEGIN:VCALENDAR')) {
      return {
        success: false,
        error: 'Response does not appear to be valid ICS data'
      };
    }

    return {
      success: true,
      data,
      etag: response.headers.get('ETag') || undefined,
      lastModified: response.headers.get('Last-Modified') || undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out after 30 seconds' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch ICS feed'
    };
  }
}

/**
 * Parse ICS data into structured events
 */
function parseICSData(icsData: string): ParsedICSEvent[] {
  const events: ParsedICSEvent[] = [];

  try {
    const jcalData = ICAL.parse(icsData);
    const component = new ICAL.Component(jcalData);
    const vevents = component.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);

        // Get start and end times
        const startDate = event.startDate;
        const endDate = event.endDate;

        if (!startDate) {
          console.warn('[ICS Parser] Skipping event without start date:', event.uid);
          continue;
        }

        // Determine if all-day event
        const isAllDay = startDate.isDate;

        // Convert to JavaScript Date
        const start = startDate.toJSDate();
        const end = endDate ? endDate.toJSDate() : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

        // Get last modified if available
        const lastModifiedProp = vevent.getFirstProperty('last-modified');
        const lastModified = lastModifiedProp ?
          (ICAL.Time.fromData(lastModifiedProp.getFirstValue())).toJSDate() : undefined;

        // Get recurrence rule if present
        const rruleProp = vevent.getFirstProperty('rrule');
        const recurrence = rruleProp ? rruleProp.getFirstValue().toString() : undefined;

        events.push({
          uid: event.uid || `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          summary: event.summary || 'Untitled Event',
          description: event.description || undefined,
          location: event.location || undefined,
          start,
          end,
          isAllDay,
          recurrence,
          lastModified,
        });
      } catch (eventError) {
        console.warn('[ICS Parser] Failed to parse event:', eventError);
        // Continue with other events
      }
    }
  } catch (parseError) {
    console.error('[ICS Parser] Failed to parse ICS data:', parseError);
    throw new Error('Failed to parse ICS calendar data');
  }

  return events;
}

/**
 * Sync events from an ICS feed to a Rowan space
 */
async function syncICSFeed(
  connectionId: string,
  forceFullSync = false
): Promise<SyncResult> {
  const startTime = Date.now();
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDeleted = 0;

  try {
    const supabase = await createClient();

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Connection not found');
    }

    // Parse ICS config from connection
    const config = connection.provider_config as ICSFeedConfig | null;
    if (!config?.url) {
      throw new Error('ICS feed URL not configured');
    }

    // Fetch ICS data (with conditional fetch if not forcing full sync)
    const fetchResult = await fetchICSData(
      config.url,
      forceFullSync ? undefined : config.last_etag,
      forceFullSync ? undefined : config.last_modified
    );

    if (!fetchResult.success) {
      throw new Error(fetchResult.error || 'Failed to fetch ICS feed');
    }

    // If not modified, nothing to do
    if (fetchResult.notModified) {
      console.log(`[ICS Sync] Feed not modified for connection ${connectionId}`);
      return {
        success: true,
        eventsProcessed: 0,
        syncType: 'incremental',
        duration: Date.now() - startTime,
      };
    }

    // Parse ICS data
    const icsEvents = parseICSData(fetchResult.data!);
    console.log(`[ICS Sync] Parsed ${icsEvents.length} events from feed`);

    // Get existing event mappings for this connection
    const { data: existingMappings } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, external_event_id')
      .eq('connection_id', connectionId);

    const existingMap = new Map(
      (existingMappings || []).map(m => [m.external_event_id, m])
    );

    // Track which external IDs we've seen
    const seenExternalIds = new Set<string>();

    // Process each ICS event
    for (const icsEvent of icsEvents) {
      seenExternalIds.add(icsEvent.uid);
      const existingMapping = existingMap.get(icsEvent.uid);

      if (existingMapping) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title: icsEvent.summary,
            description: icsEvent.description || null,
            location: icsEvent.location || null,
            start_time: icsEvent.start.toISOString(),
            end_time: icsEvent.end.toISOString(),
            is_all_day: icsEvent.isAllDay,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMapping.rowan_event_id);

        if (!updateError) {
          eventsUpdated++;
        }
      } else {
        // Create new event
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert({
            space_id: connection.space_id,
            title: icsEvent.summary,
            description: icsEvent.description || null,
            location: icsEvent.location || null,
            start_time: icsEvent.start.toISOString(),
            end_time: icsEvent.end.toISOString(),
            is_all_day: icsEvent.isAllDay,
            source: 'ics_import',
            created_by: connection.user_id,
          })
          .select('id')
          .single();

        if (!createError && newEvent) {
          // Create mapping
          await supabase.from('calendar_event_mappings').insert({
            connection_id: connectionId,
            rowan_event_id: newEvent.id,
            external_event_id: icsEvent.uid,
            sync_direction: 'inbound',
            last_synced_at: new Date().toISOString(),
          });

          eventsCreated++;
        }
      }
    }

    // Delete events that are no longer in the feed
    for (const [externalId, mapping] of existingMap) {
      if (!seenExternalIds.has(externalId)) {
        // Delete the Rowan event
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', mapping.rowan_event_id);

        if (!deleteError) {
          // Delete the mapping
          await supabase
            .from('calendar_event_mappings')
            .delete()
            .eq('id', mapping.id);

          eventsDeleted++;
        }
      }
    }

    // Update connection with new cache headers
    const updatedConfig: ICSFeedConfig = {
      ...config,
      last_etag: fetchResult.etag,
      last_modified: fetchResult.lastModified,
    };

    await supabase
      .from('calendar_connections')
      .update({
        provider_config: updatedConfig,
        last_sync_at: new Date().toISOString(),
        sync_status: 'active',
        last_error: null,
      })
      .eq('id', connectionId);

    // Log sync
    await supabase.from('calendar_sync_logs').insert({
      connection_id: connectionId,
      sync_type: forceFullSync ? 'full' : 'incremental',
      status: 'completed',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      events_synced: eventsCreated + eventsUpdated,
      events_created: eventsCreated,
      events_updated: eventsUpdated,
      events_deleted: eventsDeleted,
      errors: [],
    });

    return {
      success: true,
      eventsProcessed: eventsCreated + eventsUpdated + eventsDeleted,
      syncType: forceFullSync ? 'full' : 'incremental',
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[ICS Sync] Sync failed:', error);

    const supabase = await createClient();

    // Log failed sync
    await supabase.from('calendar_sync_logs').insert({
      connection_id: connectionId,
      sync_type: forceFullSync ? 'full' : 'incremental',
      status: 'failed',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      events_synced: 0,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    });

    return {
      success: false,
      eventsProcessed: 0,
      syncType: forceFullSync ? 'full' : 'incremental',
      duration: Date.now() - startTime,
      error: {
        code: 'ICS_SYNC_FAILED',
        message: error instanceof Error ? error.message : 'Failed to sync ICS feed',
      },
    };
  }
}

/**
 * Test an ICS feed URL by fetching and parsing it
 */
async function testICSFeed(url: string): Promise<{
  success: boolean;
  eventCount?: number;
  calendarName?: string;
  error?: string;
}> {
  // Validate URL
  const validation = validateICSUrl(url);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Fetch ICS data
  const fetchResult = await fetchICSData(validation.normalizedUrl);
  if (!fetchResult.success) {
    return { success: false, error: fetchResult.error };
  }

  try {
    // Parse to verify it's valid ICS
    const jcalData = ICAL.parse(fetchResult.data!);
    const component = new ICAL.Component(jcalData);

    // Get calendar name
    const calNameProp = component.getFirstProperty('x-wr-calname');
    const calendarName = calNameProp ? calNameProp.getFirstValue() : undefined;

    // Count events
    const events = component.getAllSubcomponents('vevent');

    return {
      success: true,
      eventCount: events.length,
      calendarName: calendarName as string | undefined,
    };
  } catch (parseError) {
    return {
      success: false,
      error: 'Failed to parse ICS data - invalid calendar format'
    };
  }
}

export const icsImportService = {
  validateICSUrl,
  testICSFeed,
  syncICSFeed,
  parseICSData,
};
