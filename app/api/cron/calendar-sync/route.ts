// Calendar Sync Cron Job
// Phase 3: Handles polling-based sync for Apple CalDAV and backup sync for Google

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { calendarSyncService } from '@/lib/services/calendar';
import { logger } from '@/lib/logger';
import { verifyCronSecret } from '@/lib/security/verify-secret';
import type { CalendarProvider } from '@/lib/types/calendar-integration';

// PERF: Prevent serverless timeout — FIX-015
export const maxDuration = 60;

/**
 * Cron API Route for Calendar Sync
 *
 * This endpoint handles:
 * - Apple CalDAV: Primary sync method (polling every 15 minutes)
 * - Google Calendar: Backup sync (webhooks are primary, this is fallback)
 *
 * Query Parameters:
 * - provider: 'google' | 'apple' | 'all' (default: 'all')
 * - connection_id: specific connection to sync (optional)
 * - force_full: '1' to force full sync instead of incremental (optional)
 *
 * Schedule: Every 15 minutes
 */

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'all';
  const connectionId = searchParams.get('connection_id');
  const forceFullSync = searchParams.get('force_full') === '1';
  const authHeader = request.headers.get('authorization');

  // SECURITY: Fail-closed if CRON_SECRET is not configured
  if (!process.env.CRON_SECRET) {
    logger.error('CRON_SECRET environment variable not configured', new Error('Missing CRON_SECRET'), { component: 'cron-route', action: 'auth-check' });
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Auth check for cron job (timing-safe comparison)
  if (!verifyCronSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = supabaseAdmin;
    const results: {
      provider: string;
      connection_id: string;
      success: boolean;
      events_synced?: number;
      error?: string;
    }[] = [];

    // Build query for connections due for sync
    let query = supabase
      .from('calendar_connections')
      .select('*')
      .eq('sync_enabled', true)
      .in('sync_status', ['active', 'error']) // Include error status to retry
      .lte('next_sync_at', new Date().toISOString());

    // Filter by provider if specified
    if (provider !== 'all') {
      if (!['google', 'apple', 'outlook', 'ics', 'cozi'].includes(provider)) {
        return NextResponse.json(
          { error: 'Invalid provider. Use: google, apple, outlook, ics, cozi, or all' },
          { status: 400 }
        );
      }
      query = query.eq('provider', provider);
    }

    // Filter by specific connection if provided
    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    const { data: connections, error: queryError } = await query;

    if (queryError) {
      logger.error('Failed to fetch connections', queryError instanceof Error ? queryError : new Error(String(queryError)), { component: 'cron-route', action: 'fetch-connections' });
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No connections due for sync',
        duration_ms: Date.now() - startTime,
      });
    }

    logger.info(`Processing ${connections.length} connections`, { component: 'cron-route', action: 'process-connections', count: connections.length });

    // Process each connection
    for (const connection of connections) {
      const connectionStartTime = Date.now();

      try {
        logger.info(`Syncing ${connection.provider} connection ${connection.id}`, { component: 'cron-route', action: 'sync-connection', provider: connection.provider, connectionId: connection.id });

        // Update status to syncing
        await supabase
          .from('calendar_connections')
          .update({ sync_status: 'syncing' })
          .eq('id', connection.id);

        // Perform sync
        const syncResult = await calendarSyncService.performSync(
          connection.id,
          forceFullSync ? 'full' : 'incremental'
        );

        // Calculate next sync time based on provider
        const nextSyncMinutes = getNextSyncMinutes(connection.provider as CalendarProvider);
        const nextSync = new Date();
        nextSync.setMinutes(nextSync.getMinutes() + nextSyncMinutes);

        // Update connection with results
        await supabase
          .from('calendar_connections')
          .update({
            sync_status: syncResult.success ? 'active' : 'error',
            last_sync_at: new Date().toISOString(),
            next_sync_at: nextSync.toISOString(),
            last_error: syncResult.success ? null : syncResult.errors?.[0]?.error_message,
          })
          .eq('id', connection.id);

        results.push({
          provider: connection.provider,
          connection_id: connection.id,
          success: syncResult.success,
          events_synced: syncResult.eventsProcessed,
          error: syncResult.success ? undefined : syncResult.errors?.[0]?.error_message,
        });

        logger.info(`${connection.provider} ${connection.id}: ${syncResult.success ? 'Success' : 'Failed'} - ${syncResult.eventsProcessed} events in ${Date.now() - connectionStartTime}ms`, { component: 'cron-route', action: 'sync-result', provider: connection.provider, connectionId: connection.id, success: syncResult.success, eventsProcessed: syncResult.eventsProcessed, durationMs: Date.now() - connectionStartTime });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error syncing ${connection.id}`, error instanceof Error ? error : new Error(String(error)), { component: 'cron-route', action: 'sync-connection', connectionId: connection.id });

        // Update connection with error status
        await supabase
          .from('calendar_connections')
          .update({
            sync_status: 'error',
            last_error: errorMessage,
            // Still set next sync so it will retry
            next_sync_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          })
          .eq('id', connection.id);

        results.push({
          provider: connection.provider,
          connection_id: connection.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const totalEvents = results.reduce((sum, r) => sum + (r.events_synced || 0), 0);

    return NextResponse.json({
      success: failureCount === 0,
      message: `Processed ${connections.length} connections: ${successCount} succeeded, ${failureCount} failed`,
      total_events_synced: totalEvents,
      duration_ms: Date.now() - startTime,
      results,
    });
  } catch (error) {
    logger.error('Calendar sync cron fatal error', error instanceof Error ? error : new Error(String(error)), { component: 'cron-route', action: 'fatal-error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get the number of minutes until next sync based on provider
 */
function getNextSyncMinutes(provider: CalendarProvider): number {
  switch (provider) {
    case 'google':
      // Google has webhooks, so polling is backup (15 minutes)
      return 15;
    case 'apple':
      // Apple requires polling (15 minutes as per user preference)
      return 15;
    case 'outlook':
      // Outlook has webhooks, so polling is backup (15 minutes)
      return 15;
    case 'ics':
      // ICS feeds are read-only, sync every 15 minutes to match other providers
      return 15;
    case 'cozi':
      // Cozi has no delta sync support (30 minutes)
      return 30;
    default:
      return 15;
  }
}
