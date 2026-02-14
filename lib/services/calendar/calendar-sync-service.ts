// Calendar Sync Service
// Phase 2: Main orchestration for bidirectional calendar synchronization

import { createClient } from '@/lib/supabase/server';
import { googleCalendarService } from './google-calendar-service';
import { appleCalDAVService } from './apple-caldav-service';
import { eventMapper } from './event-mapper';
import { logger } from '@/lib/logger';
import type {
  CalendarConnection,
  CalendarEventMapping,
  SyncResult,
  SyncError,
  GoogleCalendarEvent,
  CalDAVEvent,
  ParsedICalEvent,
  RowanEventSnapshot,
  SyncType,
  SyncDirection,
  CalendarProvider,
} from '@/lib/types/calendar-integration';

// =============================================================================
// SYNC ORCHESTRATION
// =============================================================================

/** Performs a bidirectional calendar sync (full or incremental) for a calendar connection. */
export async function performSync(
  connectionId: string,
  syncType: SyncType = 'incremental'
): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = await createClient();

  // Get connection details
  const { data: connection, error: connectionError } = await supabase
    .from('calendar_connections')
    .select('id, user_id, space_id, provider, provider_account_id, provider_calendar_id, access_token_vault_id, refresh_token_vault_id, token_expires_at, sync_direction, sync_status, sync_token, last_sync_at, next_sync_at, webhook_channel_id, webhook_resource_id, webhook_expires_at, provider_config, created_at, updated_at')
    .eq('id', connectionId)
    .single();

  if (connectionError || !connection) {
    return {
      success: false,
      connection_id: connectionId,
      sync_type: syncType,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      conflicts_detected: 0,
      errors: [{ operation: 'update', error_code: 'CONNECTION_NOT_FOUND', error_message: 'Connection not found', recoverable: false }],
      duration_ms: Date.now() - startTime,
    };
  }

  // Create sync log entry
  logger.info('[Sync] Creating sync log entry...', { component: 'lib-calendar-sync-service' });
  const { data: syncLog, error: syncLogError } = await supabase
    .from('calendar_sync_logs')
    .insert({
      connection_id: connectionId,
      sync_type: syncType,
      sync_direction: connection.sync_direction,
      status: 'in_progress',
      triggered_by: 'sync_service',
    })
    .select()
    .single();

  if (syncLogError) {
    logger.error('[Sync] Failed to create sync log:', syncLogError, { component: 'lib-calendar-sync-service', action: 'service_call' });
  } else {
    logger.info('[Sync] Created sync log:', { component: 'lib-calendar-sync-service', data: syncLog?.id });
  }

  // Update connection status to syncing
  await supabase
    .from('calendar_connections')
    .update({ sync_status: 'syncing' })
    .eq('id', connectionId);

  try {
    let result: SyncResult;

    switch (connection.provider) {
      case 'google':
        result = await syncGoogleCalendar(connection, syncType);
        break;
      case 'apple':
        result = await syncAppleCalendar(connection, syncType);
        break;
      case 'cozi':
        result = await syncCoziCalendar(connection, syncType);
        break;
      default:
        throw new Error(`Unknown provider: ${connection.provider}`);
    }

    // Update sync log with results
    if (syncLog) {
      await supabase
        .from('calendar_sync_logs')
        .update({
          status: result.success ? 'completed' : 'partial',
          completed_at: new Date().toISOString(),
          events_created: result.events_created,
          events_updated: result.events_updated,
          events_deleted: result.events_deleted,
          conflicts_detected: result.conflicts_detected,
          error_message: result.errors.length > 0 ? result.errors[0].error_message : null,
          error_details: result.errors.length > 0 ? { errors: result.errors } : null,
        })
        .eq('id', syncLog.id);
    }

    // Update connection with last sync time and next sync
    const nextSync = new Date();
    nextSync.setMinutes(nextSync.getMinutes() + getSyncInterval(connection.provider));

    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'active',
        last_sync_at: new Date().toISOString(),
        next_sync_at: nextSync.toISOString(),
        sync_token: result.next_sync_token || connection.sync_token,
      })
      .eq('id', connectionId);

    return result;
  } catch (error) {
    logger.error('Sync failed:', error, { component: 'lib-calendar-sync-service', action: 'service_call' });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update sync log with error
    if (syncLog) {
      await supabase
        .from('calendar_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_code: 'SYNC_FAILED',
          error_message: errorMessage,
        })
        .eq('id', syncLog.id);
    }

    // Update connection status to error
    await supabase
      .from('calendar_connections')
      .update({ sync_status: 'error' })
      .eq('id', connectionId);

    return {
      success: false,
      connection_id: connectionId,
      sync_type: syncType,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      conflicts_detected: 0,
      errors: [{ operation: 'update', error_code: 'SYNC_FAILED', error_message: errorMessage, recoverable: true }],
      duration_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// GOOGLE CALENDAR SYNC
// =============================================================================

async function syncGoogleCalendar(
  connection: CalendarConnection,
  syncType: SyncType
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: SyncError[] = [];
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDeleted = 0;
  let conflictsDetected = 0;
  let nextSyncToken: string | undefined;

  logger.info('[Sync] Starting Google Calendar sync for connection:', { component: 'lib-calendar-sync-service', data: connection.id });
  logger.info('[Sync] Sync type and direction:', { component: 'lib-calendar-sync-service', data: { syncType, direction: connection.sync_direction } });

  try {
    // 1. INBOUND: Fetch events from Google Calendar
    logger.info('[Sync] Fetching events from Google Calendar...', { component: 'lib-calendar-sync-service' });
    const syncResponse = await googleCalendarService.getEvents(connection.id, {
      syncToken: syncType === 'incremental' ? connection.sync_token || undefined : undefined,
    });

    logger.info('[Sync] Received events from Google', { component: 'lib-calendar-sync-service', data: syncResponse.items.length });
    nextSyncToken = syncResponse.nextSyncToken;

    // Process inbound events (External → Rowan)
    if (connection.sync_direction !== 'outbound_only') {
      logger.info('[Sync] Processing inbound events...', { component: 'lib-calendar-sync-service' });
      for (const googleEvent of syncResponse.items) {
        logger.info('[Sync] Processing event:', { component: 'lib-calendar-sync-service', data: { id: googleEvent.id, summary: googleEvent.summary } });
        try {
          const result = await processInboundEvent(
            connection,
            googleEvent,
            connection.sync_direction
          );

          logger.info('[Sync] Event result:', { component: 'lib-calendar-sync-service', data: result.action });
          if (result.action === 'created') eventsCreated++;
          if (result.action === 'updated') eventsUpdated++;
          if (result.action === 'deleted') eventsDeleted++;
          if (result.conflict) conflictsDetected++;
        } catch (error) {
          logger.error('[Sync] Error processing event:', undefined, { component: 'lib-calendar-sync-service', action: 'service_call', details: googleEvent.id, error });
          errors.push({
            external_event_id: googleEvent.id,
            operation: 'update',
            error_code: 'INBOUND_SYNC_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          });
        }
      }
    } else {
      logger.info('[Sync] Skipping inbound - direction is outbound_only', { component: 'lib-calendar-sync-service' });
    }

    // 2. OUTBOUND: Process pending queue items (Rowan → Google)
    if (connection.sync_direction !== 'inbound_only') {
      const queueResult = await processOutboundQueue(connection);
      eventsCreated += queueResult.created;
      eventsUpdated += queueResult.updated;
      eventsDeleted += queueResult.deleted;
      errors.push(...queueResult.errors);
    }

    return {
      success: errors.length === 0,
      connection_id: connection.id,
      sync_type: syncType,
      events_created: eventsCreated,
      events_updated: eventsUpdated,
      events_deleted: eventsDeleted,
      conflicts_detected: conflictsDetected,
      errors,
      duration_ms: Date.now() - startTime,
      next_sync_token: nextSyncToken,
    };
  } catch (error) {
    throw error;
  }
}

// =============================================================================
// INBOUND EVENT PROCESSING (External → Rowan)
// =============================================================================

async function processInboundEvent(
  connection: CalendarConnection,
  externalEvent: GoogleCalendarEvent,
  syncDirection: SyncDirection
): Promise<{ action: 'created' | 'updated' | 'deleted' | 'skipped'; conflict: boolean }> {
  const supabase = await createClient();

  // Check if we have a mapping for this event
  const { data: mapping } = await supabase
    .from('calendar_event_mappings')
    .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at, rowan_event:events(*)')
    .eq('connection_id', connection.id)
    .eq('external_event_id', externalEvent.id)
    .single();

  // Handle deleted events from external source
  if (externalEvent.status === 'cancelled') {
    if (mapping && mapping.rowan_event) {
      // Check if Rowan has local enhancements - if so, DON'T delete
      const rowanEvent = mapping.rowan_event as RowanEventSnapshot;
      const hasLocalEnhancements =
        rowanEvent.is_recurring ||
        rowanEvent.recurrence_pattern ||
        rowanEvent.category ||
        rowanEvent.assigned_to ||
        (rowanEvent.status && rowanEvent.status !== 'not-started');

      if (hasLocalEnhancements) {
        // Preserve Rowan event, just disconnect from external
        logger.info('[Sync] External deleted but Rowan has local enhancements - preserving event', { component: 'lib-calendar-sync-service' });
        await supabase
          .from('events')
          .update({ external_source: null, last_external_sync: null })
          .eq('id', mapping.rowan_event_id);

        // Remove the mapping (no longer linked)
        await supabase
          .from('calendar_event_mappings')
          .delete()
          .eq('id', mapping.id);

        return { action: 'skipped', conflict: true };
      }

      // No local enhancements - safe to soft delete
      await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', mapping.rowan_event_id);

      await supabase
        .from('calendar_event_mappings')
        .delete()
        .eq('id', mapping.id);

      return { action: 'deleted', conflict: false };
    }
    return { action: 'skipped', conflict: false };
  }

  // Map external event to Rowan format
  const externalData = eventMapper.mapGoogleToRowan(externalEvent, connection.space_id);

  if (mapping && mapping.rowan_event) {
    const rowanEvent = mapping.rowan_event as RowanEventSnapshot;

    // Check for conflicts (both modified since last sync)
    const conflictInfo = await checkForConflict(
      mapping as CalendarEventMapping & { rowan_event: RowanEventSnapshot },
      externalEvent
    );

    // Use NON-DESTRUCTIVE MERGE instead of external wins
    // This preserves Rowan enhancements (recurrence, status, category, etc.)
    const mergedData = mergeEventData(rowanEvent, externalData, conflictInfo);

    logger.info('[Sync] Merging event data (non-destructive):', { component: 'lib-calendar-sync-service', data: {
      eventId: mapping.rowan_event_id,
      rowanModified: conflictInfo.rowanModified,
      externalModified: conflictInfo.externalModified,
      hasConflict: conflictInfo.hasConflict,
      preservedRecurrence: mergedData.is_recurring ? mergedData.recurrence_pattern : null,
    } });

    if (conflictInfo.hasConflict) {
      // Record conflict for user review, but continue with merge
      await recordConflict(
        mapping as CalendarEventMapping & { rowan_event: RowanEventSnapshot },
        externalEvent,
        connection.id,
        'merged'
      );
    }

    // Update with merged data (preserves Rowan enhancements)
    const { error: updateError } = await supabase
      .from('events')
      .update({
        ...mergedData,
        sync_locked: false,
      })
      .eq('id', mapping.rowan_event_id);

    if (updateError) {
      logger.error('[Sync] Failed to update event:', updateError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    // Update mapping
    const { error: mappingError } = await supabase
      .from('calendar_event_mappings')
      .update({
        external_etag: externalEvent.etag,
        last_synced_at: new Date().toISOString(),
        has_conflict: conflictInfo.hasConflict,
      })
      .eq('id', mapping.id);

    if (mappingError) {
      logger.error('[Sync] Failed to update mapping:', mappingError, { component: 'lib-calendar-sync-service', action: 'service_call' });
    }

    return { action: 'updated', conflict: conflictInfo.hasConflict };
  } else {
    // Create new Rowan event
    logger.info('[Sync] Creating new event with data:', { component: 'lib-calendar-sync-service', data: externalData });
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        ...externalData,
        last_external_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[Sync] Failed to create event:', insertError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      throw new Error(`Failed to create event: ${insertError.message}`);
    }

    if (newEvent) {
      // Create mapping
      const { error: mappingError } = await supabase.from('calendar_event_mappings').insert({
        rowan_event_id: newEvent.id,
        connection_id: connection.id,
        external_event_id: externalEvent.id,
        external_calendar_id: externalEvent.calendarId || 'primary',
        sync_direction: syncDirection,
        external_etag: externalEvent.etag,
      });

      if (mappingError) {
        logger.error('[Sync] Failed to create mapping:', mappingError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      }

      logger.info('[Sync] Created event for external:', { component: 'lib-calendar-sync-service', data: { eventId: newEvent.id, externalId: externalEvent.id } });
    }

    return { action: 'created', conflict: false };
  }
}

// =============================================================================
// OUTBOUND QUEUE PROCESSING (Rowan → External)
// =============================================================================

async function processOutboundQueue(
  connection: CalendarConnection
): Promise<{ created: number; updated: number; deleted: number; errors: SyncError[] }> {
  const supabase = await createClient();
  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: SyncError[] = [];

  // Get pending queue items for this connection
  const { data: queueItems } = await supabase
    .from('calendar_sync_queue')
    .select('id, event_id, connection_id, mapping_id, operation, priority, status, event_snapshot, retry_count, max_retries, last_error, next_retry_at, created_at, updated_at, processed_at')
    .eq('connection_id', connection.id)
    .in('status', ['pending', 'failed'])
    .lt('retry_count', 3)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50);

  if (!queueItems || queueItems.length === 0) {
    return { created, updated, deleted, errors };
  }

  for (const item of queueItems) {
    try {
      // Mark as processing
      await supabase.rpc('mark_queue_item_processing', { p_queue_id: item.id });

      switch (item.operation) {
        case 'create':
          await processOutboundCreate(connection, item);
          created++;
          break;
        case 'update':
          await processOutboundUpdate(connection, item);
          updated++;
          break;
        case 'delete':
          await processOutboundDelete(connection, item);
          deleted++;
          break;
      }

      // Mark as completed
      await supabase.rpc('mark_queue_item_completed', { p_queue_id: item.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await supabase.rpc('mark_queue_item_failed', {
        p_queue_id: item.id,
        p_error_message: errorMessage,
      });

      errors.push({
        event_id: item.event_id,
        operation: item.operation,
        error_code: 'OUTBOUND_SYNC_ERROR',
        error_message: errorMessage,
        recoverable: true,
      });
    }
  }

  return { created, updated, deleted, errors };
}

async function processOutboundCreate(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null }
): Promise<void> {
  if (!queueItem.event_id) return;

  const supabase = await createClient();

  // Get the Rowan event
  const { data: event } = await supabase
    .from('events')
    .select('id, space_id, title, description, start_time, end_time, all_day, location, category, status, is_recurring, recurrence_pattern, custom_color, timezone, assigned_to, event_type, external_source, last_external_sync, sync_locked, created_at, updated_at, created_by')
    .eq('id', queueItem.event_id)
    .single();

  if (!event) return;

  // Lock event
  await supabase.rpc('lock_event_for_sync', { p_event_id: event.id });

  try {
    // Map to Google format and create
    const googleEventData = eventMapper.mapRowanToGoogle(event as RowanEventSnapshot);
    const createdEvent = await googleCalendarService.createEvent(
      connection.id,
      googleEventData
    );

    // Create mapping
    await supabase.from('calendar_event_mappings').insert({
      rowan_event_id: event.id,
      connection_id: connection.id,
      external_event_id: createdEvent.id,
      external_calendar_id: 'primary',
      sync_direction: connection.sync_direction,
      external_etag: createdEvent.etag,
    });
  } finally {
    // Unlock event
    await supabase.rpc('unlock_event_after_sync', { p_event_id: event.id, p_mark_synced: true });
  }
}

async function processOutboundUpdate(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null }
): Promise<void> {
  if (!queueItem.event_id) return;

  const supabase = await createClient();

  // Get mapping
  const { data: mapping } = await supabase
    .from('calendar_event_mappings')
    .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
    .eq('rowan_event_id', queueItem.event_id)
    .eq('connection_id', connection.id)
    .single();

  if (!mapping) {
    // No mapping exists, treat as create
    await processOutboundCreate(connection, queueItem);
    return;
  }

  // Get the Rowan event
  const { data: event } = await supabase
    .from('events')
    .select('id, space_id, title, description, start_time, end_time, all_day, location, category, status, is_recurring, recurrence_pattern, custom_color, timezone, assigned_to, event_type, external_source, last_external_sync, sync_locked, created_at, updated_at, created_by')
    .eq('id', queueItem.event_id)
    .single();

  if (!event) return;

  // Lock event
  await supabase.rpc('lock_event_for_sync', { p_event_id: event.id });

  try {
    // Map to Google format and update
    const googleEventData = eventMapper.mapRowanToGoogle(event as RowanEventSnapshot);
    const updatedEvent = await googleCalendarService.updateEvent(
      connection.id,
      mapping.external_event_id,
      googleEventData
    );

    // Update mapping
    await supabase
      .from('calendar_event_mappings')
      .update({
        external_etag: updatedEvent.etag,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', mapping.id);
  } finally {
    // Unlock event
    await supabase.rpc('unlock_event_after_sync', { p_event_id: event.id, p_mark_synced: true });
  }
}

async function processOutboundDelete(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null; event_snapshot: RowanEventSnapshot | null }
): Promise<void> {
  const supabase = await createClient();

  // Try to find mapping by event_id or mapping_id
  let mapping;

  if (queueItem.mapping_id) {
    const { data } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
      .eq('id', queueItem.mapping_id)
      .single();
    mapping = data;
  } else if (queueItem.event_id) {
    const { data } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
      .eq('rowan_event_id', queueItem.event_id)
      .eq('connection_id', connection.id)
      .single();
    mapping = data;
  }

  if (!mapping) return;

  // Delete from Google Calendar
  await googleCalendarService.deleteEvent(connection.id, mapping.external_event_id);

  // Remove mapping
  await supabase.from('calendar_event_mappings').delete().eq('id', mapping.id);
}

// =============================================================================
// CONFLICT DETECTION & RESOLUTION (Non-Destructive Merge Strategy)
// =============================================================================

/**
 * Detect if there's a conflict between Rowan and external versions
 * Returns detailed info about what changed on each side
 */
async function checkForConflict(
  mapping: CalendarEventMapping & { rowan_event: RowanEventSnapshot },
  externalEvent: GoogleCalendarEvent
): Promise<{ hasConflict: boolean; rowanModified: boolean; externalModified: boolean }> {
  const rowanUpdated = new Date(mapping.rowan_event.updated_at);
  const externalUpdated = new Date(externalEvent.updated);
  const lastSynced = new Date(mapping.last_synced_at);

  // Both modified since last sync = conflict
  const rowanModifiedSinceSync = rowanUpdated > lastSynced;
  const externalModifiedSinceSync = externalUpdated > lastSynced;

  // Allow 5 second buffer for nearly simultaneous edits
  const timeDiff = Math.abs(rowanUpdated.getTime() - externalUpdated.getTime());
  const isNearlySimultaneous = timeDiff < 5000;

  return {
    hasConflict: rowanModifiedSinceSync && externalModifiedSinceSync && !isNearlySimultaneous,
    rowanModified: rowanModifiedSinceSync,
    externalModified: externalModifiedSinceSync,
  };
}

/**
 * Non-destructive merge strategy - preserves Rowan enhancements while accepting external updates
 *
 * Philosophy:
 * - Rowan-only fields (recurrence, custom settings) are ALWAYS preserved
 * - External fields only override if Rowan hasn't modified them locally
 * - Like "document (1).pdf" - we never lose data, we accumulate/merge
 */
function mergeEventData(
  rowanEvent: RowanEventSnapshot,
  externalData: Record<string, unknown>,
  conflictInfo: { rowanModified: boolean; externalModified: boolean }
): Record<string, unknown> {
  // Fields that Rowan can enhance and should NEVER be overwritten by external
  const rowanOnlyFields = [
    'is_recurring',
    'recurrence_pattern',
    'status',           // Rowan tracks task-like status (not-started, in-progress, completed)
    'category',         // Rowan categories (work, personal, family, etc.)
    'assigned_to',      // Rowan assignment feature
    'event_type',       // Rowan event types
  ];

  // Fields that should merge intelligently (external can update, but check for enhancements)
  const mergeableFields = [
    'description',      // Merge: Rowan might add notes, external might have updates
    'location',         // Use non-null version
    'custom_color',     // Rowan color preference
    'timezone',         // Use the one that's set
  ];

  // Fields that external is authoritative for (unless Rowan modified them)
  const externalAuthoritativeFields = [
    'title',
    'start_time',
    'end_time',
    'all_day',
  ];

  const merged: Record<string, unknown> = {};

  // 1. Always preserve Rowan-only fields
  for (const field of rowanOnlyFields) {
    const rowanValue = rowanEvent[field as keyof RowanEventSnapshot];
    const externalValue = externalData[field];

    // Keep Rowan's value if it has one, otherwise use external
    if (rowanValue !== null && rowanValue !== undefined && rowanValue !== '') {
      merged[field] = rowanValue;
    } else if (externalValue !== null && externalValue !== undefined) {
      merged[field] = externalValue;
    }
  }

  // 2. Smart merge for mergeable fields
  for (const field of mergeableFields) {
    const rowanValue = rowanEvent[field as keyof RowanEventSnapshot];
    const externalValue = externalData[field];

    if (field === 'description') {
      // Special handling: If both have descriptions and they differ, append
      if (rowanValue && externalValue && rowanValue !== externalValue) {
        // Rowan has local notes - keep both if external changed
        if (conflictInfo.externalModified) {
          merged[field] = externalValue; // External is source of truth for description
          // Note: Could implement a merge like: `${externalValue}\n\n---\nLocal notes: ${rowanValue}`
        } else {
          merged[field] = rowanValue;
        }
      } else {
        merged[field] = rowanValue || externalValue || null;
      }
    } else {
      // For other mergeable fields, prefer non-null Rowan value
      merged[field] = rowanValue ?? externalValue ?? null;
    }
  }

  // 3. External authoritative fields - only update if Rowan hasn't modified locally
  for (const field of externalAuthoritativeFields) {
    const externalValue = externalData[field];

    if (conflictInfo.rowanModified) {
      // Rowan was modified - keep Rowan's version for time-sensitive fields
      // This prevents sync from moving an event the user just rescheduled locally
      merged[field] = rowanEvent[field as keyof RowanEventSnapshot];
    } else {
      // Rowan wasn't modified, safe to accept external
      merged[field] = externalValue ?? rowanEvent[field as keyof RowanEventSnapshot];
    }
  }

  // 4. Always keep external source metadata
  merged['external_source'] = 'google';
  merged['last_external_sync'] = new Date().toISOString();

  return merged;
}

/**
 * Record conflict for user review (but don't block sync)
 */
async function recordConflict(
  mapping: CalendarEventMapping & { rowan_event: RowanEventSnapshot },
  externalEvent: GoogleCalendarEvent,
  connectionId: string,
  resolutionStrategy: 'merged' | 'rowan_wins' | 'external_wins'
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('calendar_sync_conflicts').insert({
    mapping_id: mapping.id,
    connection_id: connectionId,
    rowan_version: mapping.rowan_event as unknown as Record<string, unknown>,
    external_version: eventMapper.createExternalSnapshot(externalEvent, 'google') as unknown as Record<string, unknown>,
    resolution_strategy: resolutionStrategy,
    winning_source: resolutionStrategy === 'rowan_wins' ? 'rowan' : resolutionStrategy === 'external_wins' ? 'external' : 'merged',
    resolution_status: 'resolved',
    resolved_at: new Date().toISOString(),
  });
}

// =============================================================================
// APPLE CALDAV SYNC
// =============================================================================

async function syncAppleCalendar(
  connection: CalendarConnection,
  syncType: SyncType
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: SyncError[] = [];
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDeleted = 0;
  let conflictsDetected = 0;
  let nextSyncToken: string | undefined;

  logger.info('[Sync] Starting Apple Calendar sync for connection:', { component: 'lib-calendar-sync-service', data: connection.id });
  logger.info('[Sync] Sync type and direction:', { component: 'lib-calendar-sync-service', data: { syncType, direction: connection.sync_direction } });

  try {
    // 1. INBOUND: Fetch events from Apple Calendar
    logger.info('[Sync] Fetching events from Apple Calendar...', { component: 'lib-calendar-sync-service' });
    const { events: calDavEvents, nextSyncToken: newCtag } = await appleCalDAVService.getEvents(
      connection.id,
      {
        calendarUrl: connection.provider_calendar_id || undefined,
        syncToken: syncType === 'incremental' ? connection.sync_token || undefined : undefined,
      }
    );

    logger.info('[Sync] Received events from Apple Calendar', { component: 'lib-calendar-sync-service', data: calDavEvents.length });
    nextSyncToken = newCtag;

    // Process inbound events (External → Rowan)
    if (connection.sync_direction !== 'outbound_only') {
      logger.info('[Sync] Processing inbound events...', { component: 'lib-calendar-sync-service' });
      for (const calDavEvent of calDavEvents) {
        if (!calDavEvent.calendarData) {
          logger.info('[Sync] Skipping event without parsed data', { component: 'lib-calendar-sync-service' });
          continue;
        }

        try {
          const result = await processAppleInboundEvent(
            connection,
            calDavEvent,
            connection.sync_direction
          );

          logger.info('[Sync] Event result:', { component: 'lib-calendar-sync-service', data: result.action });
          if (result.action === 'created') eventsCreated++;
          if (result.action === 'updated') eventsUpdated++;
          if (result.action === 'deleted') eventsDeleted++;
          if (result.conflict) conflictsDetected++;
        } catch (error) {
          logger.error('[Sync] Error processing event:', undefined, { component: 'lib-calendar-sync-service', action: 'service_call', details: calDavEvent.calendarData?.uid, error });
          errors.push({
            external_event_id: calDavEvent.calendarData?.uid || calDavEvent.url,
            operation: 'update',
            error_code: 'INBOUND_SYNC_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true,
          });
        }
      }
    } else {
      logger.info('[Sync] Skipping inbound - direction is outbound_only', { component: 'lib-calendar-sync-service' });
    }

    // 2. OUTBOUND: Process pending queue items (Rowan → Apple)
    if (connection.sync_direction !== 'inbound_only') {
      const queueResult = await processAppleOutboundQueue(connection);
      eventsCreated += queueResult.created;
      eventsUpdated += queueResult.updated;
      eventsDeleted += queueResult.deleted;
      errors.push(...queueResult.errors);
    }

    return {
      success: errors.length === 0,
      connection_id: connection.id,
      sync_type: syncType,
      events_created: eventsCreated,
      events_updated: eventsUpdated,
      events_deleted: eventsDeleted,
      conflicts_detected: conflictsDetected,
      errors,
      duration_ms: Date.now() - startTime,
      next_sync_token: nextSyncToken,
    };
  } catch (error) {
    throw error;
  }
}

// =============================================================================
// APPLE INBOUND EVENT PROCESSING (External → Rowan)
// =============================================================================

async function processAppleInboundEvent(
  connection: CalendarConnection,
  calDavEvent: CalDAVEvent,
  syncDirection: SyncDirection
): Promise<{ action: 'created' | 'updated' | 'deleted' | 'skipped'; conflict: boolean }> {
  const supabase = await createClient();
  const parsedEvent = calDavEvent.calendarData;

  if (!parsedEvent) {
    return { action: 'skipped', conflict: false };
  }

  // Check if we have a mapping for this event (by UID)
  const { data: mapping } = await supabase
    .from('calendar_event_mappings')
    .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at, rowan_event:events(*)')
    .eq('connection_id', connection.id)
    .eq('external_event_id', parsedEvent.uid)
    .single();

  // Handle deleted events (CANCELLED status)
  if (parsedEvent.status === 'CANCELLED') {
    if (mapping && mapping.rowan_event) {
      const rowanEvent = mapping.rowan_event as RowanEventSnapshot;
      const hasLocalEnhancements =
        rowanEvent.is_recurring ||
        rowanEvent.recurrence_pattern ||
        rowanEvent.category ||
        rowanEvent.assigned_to ||
        (rowanEvent.status && rowanEvent.status !== 'not-started');

      if (hasLocalEnhancements) {
        // Preserve Rowan event, just disconnect from external
        logger.info('[Sync] External deleted but Rowan has local enhancements - preserving event', { component: 'lib-calendar-sync-service' });
        await supabase
          .from('events')
          .update({ external_source: null, last_external_sync: null })
          .eq('id', mapping.rowan_event_id);

        await supabase
          .from('calendar_event_mappings')
          .delete()
          .eq('id', mapping.id);

        return { action: 'skipped', conflict: true };
      }

      // No local enhancements - safe to soft delete
      await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', mapping.rowan_event_id);

      await supabase
        .from('calendar_event_mappings')
        .delete()
        .eq('id', mapping.id);

      return { action: 'deleted', conflict: false };
    }
    return { action: 'skipped', conflict: false };
  }

  // Map external event to Rowan format
  const externalData = eventMapper.mapICalendarToRowan(parsedEvent, connection.space_id);

  if (mapping && mapping.rowan_event) {
    const rowanEvent = mapping.rowan_event as RowanEventSnapshot;

    // Check for conflicts
    const conflictInfo = await checkForAppleConflict(
      mapping as CalendarEventMapping & { rowan_event: RowanEventSnapshot },
      parsedEvent
    );

    // Use non-destructive merge
    const mergedData = mergeAppleEventData(rowanEvent, externalData as Record<string, unknown>, conflictInfo);

    logger.info('[Sync] Merging Apple event data (non-destructive):', { component: 'lib-calendar-sync-service', data: {
      eventId: mapping.rowan_event_id,
      rowanModified: conflictInfo.rowanModified,
      externalModified: conflictInfo.externalModified,
      hasConflict: conflictInfo.hasConflict,
    } });

    if (conflictInfo.hasConflict) {
      // Record conflict for user review
      await recordAppleConflict(
        mapping as CalendarEventMapping & { rowan_event: RowanEventSnapshot },
        parsedEvent,
        connection.id,
        'merged'
      );
    }

    // Update with merged data
    const { error: updateError } = await supabase
      .from('events')
      .update({
        ...mergedData,
        sync_locked: false,
      })
      .eq('id', mapping.rowan_event_id);

    if (updateError) {
      logger.error('[Sync] Failed to update event:', updateError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    // Update mapping
    const { error: mappingError } = await supabase
      .from('calendar_event_mappings')
      .update({
        external_etag: calDavEvent.etag,
        last_synced_at: new Date().toISOString(),
        has_conflict: conflictInfo.hasConflict,
      })
      .eq('id', mapping.id);

    if (mappingError) {
      logger.error('[Sync] Failed to update mapping:', mappingError, { component: 'lib-calendar-sync-service', action: 'service_call' });
    }

    return { action: 'updated', conflict: conflictInfo.hasConflict };
  } else {
    // Create new Rowan event
    logger.info('[Sync] Creating new event from Apple Calendar:', { component: 'lib-calendar-sync-service', data: parsedEvent.summary });
    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({
        ...externalData,
        external_source: 'apple',
        last_external_sync: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error('[Sync] Failed to create event:', insertError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      throw new Error(`Failed to create event: ${insertError.message}`);
    }

    if (newEvent) {
      // Create mapping
      const { error: mappingError } = await supabase.from('calendar_event_mappings').insert({
        rowan_event_id: newEvent.id,
        connection_id: connection.id,
        external_event_id: parsedEvent.uid,
        external_calendar_id: connection.provider_calendar_id || 'primary',
        sync_direction: syncDirection,
        external_etag: calDavEvent.etag,
      });

      if (mappingError) {
        logger.error('[Sync] Failed to create mapping:', mappingError, { component: 'lib-calendar-sync-service', action: 'service_call' });
      }

      logger.info('[Sync] Created event for external:', { component: 'lib-calendar-sync-service', data: { eventId: newEvent.id, externalUid: parsedEvent.uid } });
    }

    return { action: 'created', conflict: false };
  }
}

// =============================================================================
// APPLE OUTBOUND QUEUE PROCESSING (Rowan → Apple)
// =============================================================================

async function processAppleOutboundQueue(
  connection: CalendarConnection
): Promise<{ created: number; updated: number; deleted: number; errors: SyncError[] }> {
  const supabase = await createClient();
  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: SyncError[] = [];

  // Get pending queue items for this connection
  const { data: queueItems } = await supabase
    .from('calendar_sync_queue')
    .select('id, event_id, connection_id, mapping_id, operation, priority, status, event_snapshot, retry_count, max_retries, last_error, next_retry_at, created_at, updated_at, processed_at')
    .eq('connection_id', connection.id)
    .in('status', ['pending', 'failed'])
    .lt('retry_count', 3)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50);

  if (!queueItems || queueItems.length === 0) {
    return { created, updated, deleted, errors };
  }

  for (const item of queueItems) {
    try {
      // Mark as processing
      await supabase.rpc('mark_queue_item_processing', { p_queue_id: item.id });

      switch (item.operation) {
        case 'create':
          await processAppleOutboundCreate(connection, item);
          created++;
          break;
        case 'update':
          await processAppleOutboundUpdate(connection, item);
          updated++;
          break;
        case 'delete':
          await processAppleOutboundDelete(connection, item);
          deleted++;
          break;
      }

      // Mark as completed
      await supabase.rpc('mark_queue_item_completed', { p_queue_id: item.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await supabase.rpc('mark_queue_item_failed', {
        p_queue_id: item.id,
        p_error_message: errorMessage,
      });

      errors.push({
        event_id: item.event_id,
        operation: item.operation,
        error_code: 'OUTBOUND_SYNC_ERROR',
        error_message: errorMessage,
        recoverable: true,
      });
    }
  }

  return { created, updated, deleted, errors };
}

async function processAppleOutboundCreate(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null }
): Promise<void> {
  if (!queueItem.event_id) return;

  const supabase = await createClient();

  // Get the Rowan event
  const { data: event } = await supabase
    .from('events')
    .select('id, space_id, title, description, start_time, end_time, all_day, location, category, status, is_recurring, recurrence_pattern, custom_color, timezone, assigned_to, event_type, external_source, last_external_sync, sync_locked, created_at, updated_at, created_by')
    .eq('id', queueItem.event_id)
    .single();

  if (!event) return;

  // Lock event
  await supabase.rpc('lock_event_for_sync', { p_event_id: event.id });

  try {
    // Create event in Apple Calendar
    const createdEvent = await appleCalDAVService.createEvent(
      connection.id,
      event as RowanEventSnapshot,
      connection.provider_calendar_id || undefined
    );

    // Create mapping
    await supabase.from('calendar_event_mappings').insert({
      rowan_event_id: event.id,
      connection_id: connection.id,
      external_event_id: createdEvent.calendarData?.uid || `${event.id}@rowan.app`,
      external_calendar_id: connection.provider_calendar_id || 'primary',
      sync_direction: connection.sync_direction,
      external_etag: createdEvent.etag,
    });
  } finally {
    // Unlock event
    await supabase.rpc('unlock_event_after_sync', { p_event_id: event.id, p_mark_synced: true });
  }
}

async function processAppleOutboundUpdate(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null }
): Promise<void> {
  if (!queueItem.event_id) return;

  const supabase = await createClient();

  // Get mapping
  const { data: mapping } = await supabase
    .from('calendar_event_mappings')
    .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
    .eq('rowan_event_id', queueItem.event_id)
    .eq('connection_id', connection.id)
    .single();

  if (!mapping) {
    // No mapping exists, treat as create
    await processAppleOutboundCreate(connection, queueItem);
    return;
  }

  // Get the Rowan event
  const { data: event } = await supabase
    .from('events')
    .select('id, space_id, title, description, start_time, end_time, all_day, location, category, status, is_recurring, recurrence_pattern, custom_color, timezone, assigned_to, event_type, external_source, last_external_sync, sync_locked, created_at, updated_at, created_by')
    .eq('id', queueItem.event_id)
    .single();

  if (!event) return;

  // Lock event
  await supabase.rpc('lock_event_for_sync', { p_event_id: event.id });

  try {
    // We need to find the event URL - for CalDAV, the external_event_id is typically the UID
    // We construct the URL from the calendar URL + UID
    const calendarUrl = connection.provider_calendar_id || '';
    const eventUrl = `${calendarUrl}${mapping.external_event_id}.ics`;

    // Update event in Apple Calendar
    const updatedEvent = await appleCalDAVService.updateEvent(
      connection.id,
      eventUrl,
      event as RowanEventSnapshot,
      mapping.external_etag || undefined
    );

    // Update mapping
    await supabase
      .from('calendar_event_mappings')
      .update({
        external_etag: updatedEvent.etag,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', mapping.id);
  } finally {
    // Unlock event
    await supabase.rpc('unlock_event_after_sync', { p_event_id: event.id, p_mark_synced: true });
  }
}

async function processAppleOutboundDelete(
  connection: CalendarConnection,
  queueItem: { event_id: string | null; mapping_id: string | null; event_snapshot: RowanEventSnapshot | null }
): Promise<void> {
  const supabase = await createClient();

  // Try to find mapping by event_id or mapping_id
  let mapping;

  if (queueItem.mapping_id) {
    const { data } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
      .eq('id', queueItem.mapping_id)
      .single();
    mapping = data;
  } else if (queueItem.event_id) {
    const { data } = await supabase
      .from('calendar_event_mappings')
      .select('id, rowan_event_id, connection_id, external_event_id, external_calendar_id, sync_direction, rowan_etag, external_etag, last_synced_at, has_conflict, conflict_detected_at, created_at, updated_at')
      .eq('rowan_event_id', queueItem.event_id)
      .eq('connection_id', connection.id)
      .single();
    mapping = data;
  }

  if (!mapping) return;

  // Construct event URL
  const calendarUrl = connection.provider_calendar_id || '';
  const eventUrl = `${calendarUrl}${mapping.external_event_id}.ics`;

  // Delete from Apple Calendar
  await appleCalDAVService.deleteEvent(connection.id, eventUrl, mapping.external_etag || undefined);

  // Remove mapping
  await supabase.from('calendar_event_mappings').delete().eq('id', mapping.id);
}

// =============================================================================
// APPLE CONFLICT DETECTION & RESOLUTION
// =============================================================================

async function checkForAppleConflict(
  mapping: CalendarEventMapping & { rowan_event: RowanEventSnapshot },
  parsedEvent: ParsedICalEvent
): Promise<{ hasConflict: boolean; rowanModified: boolean; externalModified: boolean }> {
  const rowanUpdated = new Date(mapping.rowan_event.updated_at);
  const externalUpdated = parsedEvent.lastModified
    ? new Date(eventMapper.mapICalendarToRowan(parsedEvent, '').updated_at || new Date().toISOString())
    : new Date();
  const lastSynced = new Date(mapping.last_synced_at);

  const rowanModifiedSinceSync = rowanUpdated > lastSynced;
  const externalModifiedSinceSync = externalUpdated > lastSynced;

  // Allow 5 second buffer for nearly simultaneous edits
  const timeDiff = Math.abs(rowanUpdated.getTime() - externalUpdated.getTime());
  const isNearlySimultaneous = timeDiff < 5000;

  return {
    hasConflict: rowanModifiedSinceSync && externalModifiedSinceSync && !isNearlySimultaneous,
    rowanModified: rowanModifiedSinceSync,
    externalModified: externalModifiedSinceSync,
  };
}

function mergeAppleEventData(
  rowanEvent: RowanEventSnapshot,
  externalData: Record<string, unknown>,
  conflictInfo: { rowanModified: boolean; externalModified: boolean }
): Record<string, unknown> {
  // Same merge strategy as Google - non-destructive, preserves Rowan enhancements
  const rowanOnlyFields = [
    'is_recurring',
    'recurrence_pattern',
    'status',
    'category',
    'assigned_to',
    'event_type',
  ];

  const mergeableFields = ['description', 'location', 'custom_color', 'timezone'];

  const externalAuthoritativeFields = ['title', 'start_time', 'end_time', 'all_day'];

  const merged: Record<string, unknown> = {};

  // 1. Always preserve Rowan-only fields
  for (const field of rowanOnlyFields) {
    const rowanValue = rowanEvent[field as keyof RowanEventSnapshot];
    const externalValue = externalData[field];

    if (rowanValue !== null && rowanValue !== undefined && rowanValue !== '') {
      merged[field] = rowanValue;
    } else if (externalValue !== null && externalValue !== undefined) {
      merged[field] = externalValue;
    }
  }

  // 2. Smart merge for mergeable fields
  for (const field of mergeableFields) {
    const rowanValue = rowanEvent[field as keyof RowanEventSnapshot];
    const externalValue = externalData[field];

    if (field === 'description') {
      if (rowanValue && externalValue && rowanValue !== externalValue) {
        if (conflictInfo.externalModified) {
          merged[field] = externalValue;
        } else {
          merged[field] = rowanValue;
        }
      } else {
        merged[field] = rowanValue || externalValue || null;
      }
    } else {
      merged[field] = rowanValue ?? externalValue ?? null;
    }
  }

  // 3. External authoritative fields
  for (const field of externalAuthoritativeFields) {
    const externalValue = externalData[field];

    if (conflictInfo.rowanModified) {
      merged[field] = rowanEvent[field as keyof RowanEventSnapshot];
    } else {
      merged[field] = externalValue ?? rowanEvent[field as keyof RowanEventSnapshot];
    }
  }

  // 4. Always keep external source metadata
  merged['external_source'] = 'apple';
  merged['last_external_sync'] = new Date().toISOString();

  return merged;
}

async function recordAppleConflict(
  mapping: CalendarEventMapping & { rowan_event: RowanEventSnapshot },
  parsedEvent: ParsedICalEvent,
  connectionId: string,
  resolutionStrategy: 'merged' | 'rowan_wins' | 'external_wins'
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('calendar_sync_conflicts').insert({
    mapping_id: mapping.id,
    connection_id: connectionId,
    rowan_version: mapping.rowan_event as unknown as Record<string, unknown>,
    external_version: eventMapper.createExternalSnapshot(parsedEvent, 'apple') as unknown as Record<string, unknown>,
    resolution_strategy: resolutionStrategy,
    winning_source: resolutionStrategy === 'rowan_wins' ? 'rowan' : resolutionStrategy === 'external_wins' ? 'external' : 'merged',
    resolution_status: 'resolved',
    resolved_at: new Date().toISOString(),
  });
}

// =============================================================================
// COZI SYNC (Placeholder)
// =============================================================================

async function syncCoziCalendar(
  connection: CalendarConnection,
  syncType: SyncType
): Promise<SyncResult> {
  // TODO: Implement Cozi sync in Phase 4
  return {
    success: false,
    connection_id: connection.id,
    sync_type: syncType,
    events_created: 0,
    events_updated: 0,
    events_deleted: 0,
    conflicts_detected: 0,
    errors: [{ operation: 'update', error_code: 'NOT_IMPLEMENTED', error_message: 'Cozi sync not yet implemented', recoverable: false }],
    duration_ms: 0,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getSyncInterval(provider: CalendarProvider): number {
  // Return sync interval in minutes
  switch (provider) {
    case 'google':
      return 15; // Google has webhooks, so polling is backup
    case 'apple':
      return 15; // Apple requires polling (same as Google backup polling)
    case 'cozi':
      return 30; // Cozi has no delta sync
    default:
      return 15;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

/** Aggregated service for bidirectional calendar synchronization and outbound queue processing. */
export const calendarSyncService = {
  performSync,
  processOutboundQueue,
};
