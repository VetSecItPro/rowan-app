// ICS Feed Import Service
// Phase 5: Handles ICS/iCalendar feed import and parsing

import { createClient } from '@/lib/supabase/server';
import type { ICSFeedConfig, SyncResult } from '@/lib/types/calendar-integration';
import ICAL from 'ical.js';
import { logger } from '@/lib/logger';

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
 * SSRF Protection: Check if hostname is a private/internal IP
 * Blocks RFC1918 (private), link-local, loopback, and cloud metadata endpoints
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  // Check for common metadata endpoints (AWS, GCP, Azure, etc.)
  const metadataHosts = [
    '169.254.169.254',     // AWS/GCP metadata
    'metadata.google.internal',
    'metadata.goog',
    '100.100.100.200',     // Alibaba Cloud metadata
    'fd00:ec2::254',       // AWS IPv6 metadata
  ];
  if (metadataHosts.includes(hostname.toLowerCase())) {
    return true;
  }

  // Check for localhost variations
  if (hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname === '0.0.0.0') {
    return true;
  }

  // Check for IP address patterns
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    const [a, b, c, d] = octets;

    // Validate octets are in range
    if (octets.some(o => o > 255)) return true;

    // RFC1918 Private ranges
    if (a === 10) return true;                           // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16

    // Loopback (127.0.0.0/8)
    if (a === 127) return true;

    // Link-local (169.254.0.0/16)
    if (a === 169 && b === 254) return true;

    // CGNAT (100.64.0.0/10)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // Reserved (0.0.0.0/8)
    if (a === 0) return true;

    // Documentation ranges (shouldn't be used but block anyway)
    if (a === 192 && b === 0 && c === 2) return true;    // 192.0.2.0/24
    if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
    if (a === 203 && b === 0 && c === 113) return true;  // 203.0.113.0/24

    // Broadcast
    if (a === 255 && b === 255 && c === 255 && d === 255) return true;
  }

  // Block internal domain patterns
  const internalPatterns = [
    /\.internal$/i,
    /\.local$/i,
    /\.corp$/i,
    /\.home$/i,
    /\.lan$/i,
    /\.intranet$/i,
  ];
  if (internalPatterns.some(p => p.test(hostname))) {
    return true;
  }

  return false;
}

/**
 * Validate an ICS feed URL
 * SECURITY: Includes SSRF protection to block private/internal targets
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

    // SECURITY: Only allow HTTPS in production to prevent MITM attacks
    // Allow http:// only in development for local testing
    if (process.env.NODE_ENV === 'production') {
      if (parsedUrl.protocol !== 'https:') {
        return { valid: false, normalizedUrl, error: 'URL must use HTTPS protocol' };
      }
    } else {
      // Development: allow http and https
      if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
        return { valid: false, normalizedUrl, error: 'URL must use HTTP or HTTPS protocol' };
      }
    }

    // SECURITY: Block private/internal IPs to prevent SSRF attacks
    // This blocks: RFC1918, loopback, link-local, cloud metadata, internal domains
    if (isPrivateOrReservedHost(parsedUrl.hostname)) {
      logger.warn('[ICS Validation] Blocked SSRF attempt to private/internal host', {
        component: 'lib-ics-import-service',
        hostname: parsedUrl.hostname,
      });
      return { valid: false, normalizedUrl, error: 'URL points to a private or internal address' };
    }

    // Block non-standard ports in production (except 443 for HTTPS)
    if (process.env.NODE_ENV === 'production' && parsedUrl.port && parsedUrl.port !== '443') {
      return { valid: false, normalizedUrl, error: 'Non-standard ports are not allowed' };
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
          logger.warn('[ICS Parser] Skipping event without start date', { component: 'lib-ics-import-service', eventUid: event.uid });
          continue;
        }

        // Determine if all-day event
        const isAllDay = startDate.isDate;

        // Convert to JavaScript Date
        const start = startDate.toJSDate();
        const end = endDate ? endDate.toJSDate() : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

        // Get last modified if available
        const lastModifiedProp = vevent.getFirstProperty('last-modified');
        let lastModified: Date | undefined;
        if (lastModifiedProp) {
          const lastModifiedValue = lastModifiedProp.getFirstValue();
          if (lastModifiedValue && typeof lastModifiedValue === 'object' && 'toJSDate' in lastModifiedValue) {
            lastModified = (lastModifiedValue as { toJSDate: () => Date }).toJSDate();
          }
        }

        // Get recurrence rule if present
        const rruleProp = vevent.getFirstProperty('rrule');
        const recurrence = rruleProp ? String(rruleProp.getFirstValue()) : undefined;

        events.push({
          uid: event.uid || `generated-${crypto.randomUUID()}`,
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
        logger.warn('[ICS Parser] Failed to parse event:', { component: 'lib-ics-import-service', error: eventError });
        // Continue with other events
      }
    }
  } catch (parseError) {
    logger.error('[ICS Parser] Failed to parse ICS data:', parseError, { component: 'lib-ics-import-service', action: 'service_call' });
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
      .select('id, user_id, space_id, provider, provider_account_id, provider_calendar_id, access_token_vault_id, refresh_token_vault_id, token_expires_at, sync_direction, sync_status, sync_token, last_sync_at, next_sync_at, webhook_channel_id, webhook_resource_id, webhook_expires_at, provider_config, created_at, updated_at')
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
      logger.info(`[ICS Sync] Feed not modified for connection ${connectionId}`, { component: 'lib-ics-import-service' });
      return {
        success: true,
        connection_id: connectionId,
        sync_type: 'incremental',
        events_created: 0,
        events_updated: 0,
        events_deleted: 0,
        eventsProcessed: 0,
        conflicts_detected: 0,
        errors: [],
        duration_ms: Date.now() - startTime,
      };
    }

    // Parse ICS data
    const icsEvents = parseICSData(fetchResult.data!);
    logger.info(`[ICS Sync] Parsed ${icsEvents.length} events from feed`, { component: 'lib-ics-import-service' });

    // Get existing event mappings for this connection
    const { data: existingMappings } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, external_event_id')
      .eq('connection_id', connectionId);

    interface EventMapping {
      id: string;
      rowan_event_id: string;
      external_event_id: string;
    }
    const existingMap = new Map<string, EventMapping>(
      (existingMappings || []).map((m: EventMapping) => [m.external_event_id, m])
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
      connection_id: connectionId,
      sync_type: forceFullSync ? 'full' : 'incremental',
      events_created: eventsCreated,
      events_updated: eventsUpdated,
      events_deleted: eventsDeleted,
      eventsProcessed: eventsCreated + eventsUpdated + eventsDeleted,
      conflicts_detected: 0,
      errors: [],
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('[ICS Sync] Sync failed:', error, { component: 'lib-ics-import-service', action: 'service_call' });

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
      connection_id: connectionId,
      sync_type: forceFullSync ? 'full' : 'incremental',
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      eventsProcessed: 0,
      conflicts_detected: 0,
      errors: [{
        operation: 'update' as const,
        error_code: 'ICS_SYNC_FAILED',
        error_message: error instanceof Error ? error.message : 'Failed to sync ICS feed',
        recoverable: true,
      }],
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Import events directly from ICS file content (one-time import, no connection)
 */
async function importICSFile(
  icsContent: string,
  spaceId: string,
  userId: string,
  fileName?: string
): Promise<{
  success: boolean;
  eventsImported: number;
  error?: string;
}> {
  try {
    // Validate it looks like ICS data
    if (!icsContent.includes('BEGIN:VCALENDAR')) {
      return {
        success: false,
        eventsImported: 0,
        error: 'File does not appear to be valid ICS/iCalendar data'
      };
    }

    // Parse ICS data
    const events = parseICSData(icsContent);

    if (events.length === 0) {
      return {
        success: false,
        eventsImported: 0,
        error: 'No events found in the ICS file'
      };
    }

    const supabase = await createClient();
    let eventsImported = 0;

    // Import each event
    for (const event of events) {
      const { error } = await supabase.from('events').insert({
        space_id: spaceId,
        title: event.summary,
        description: event.description || null,
        location: event.location || null,
        start_time: event.start.toISOString(),
        end_time: event.end.toISOString(),
        is_all_day: event.isAllDay,
        source: 'ics_file_import',
        created_by: userId,
        // Store file name in metadata for reference
        metadata: fileName ? { imported_from: fileName } : null,
      });

      if (!error) {
        eventsImported++;
      }
    }

    return {
      success: true,
      eventsImported,
    };
  } catch (error) {
    logger.error('[ICS File Import] Error:', error, { component: 'lib-ics-import-service', action: 'service_call' });
    return {
      success: false,
      eventsImported: 0,
      error: error instanceof Error ? error.message : 'Failed to import ICS file'
    };
  }
}

/**
 * Validate ICS file content
 */
function validateICSContent(content: string): {
  valid: boolean;
  eventCount?: number;
  calendarName?: string;
  error?: string;
} {
  try {
    if (!content.includes('BEGIN:VCALENDAR')) {
      return { valid: false, error: 'Content does not appear to be valid ICS data' };
    }

    const jcalData = ICAL.parse(content);
    const component = new ICAL.Component(jcalData);

    // Get calendar name
    const calNameProp = component.getFirstProperty('x-wr-calname');
    const calendarName = calNameProp ? calNameProp.getFirstValue() : undefined;

    // Count events
    const events = component.getAllSubcomponents('vevent');

    return {
      valid: true,
      eventCount: events.length,
      calendarName: calendarName as string | undefined,
    };
  } catch {
    return { valid: false, error: 'Failed to parse ICS data - invalid format' };
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
  } catch {
    return {
      success: false,
      error: 'Failed to parse ICS data - invalid calendar format'
    };
  }
}

/** Service for validating, parsing, and syncing ICS calendar feeds. */
export const icsImportService = {
  validateICSUrl,
  validateICSContent,
  testICSFeed,
  syncICSFeed,
  parseICSData,
  importICSFile,
};
