// Calendar Sync API Route
// Phase 2: Manual sync trigger for calendar connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calendarSyncService } from '@/lib/services/calendar';
import { ManualSyncRequestSchema } from '@/lib/validations/calendar-integration-schemas';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

// Query parameter validation schema for GET endpoint
const GetQueryParamsSchema = z.object({
  connection_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function POST(request: NextRequest) {
  logger.info('[Calendar Sync] POST request received', { component: 'api-route' });

  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    logger.info('[Calendar Sync] Auth check:', { component: 'api-route', data: { userId: user?.id, authError: authError?.message } });

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    logger.info('[Calendar Sync] Request body:', { component: 'api-route', data: body });
    const validatedData = ManualSyncRequestSchema.parse(body);

    // Verify connection exists and get ownership info
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*, user_id')
      .eq('id', validatedData.connection_id)
      .single();

    if (connectionError || !connection) {
      logger.error('[Calendar Sync] Connection not found:', connectionError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the space
    const { data: spaceMember } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('space_id', connection.space_id)
      .eq('user_id', user.id)
      .single();

    if (!spaceMember) {
      logger.error('[Calendar Sync] Access denied for user:', undefined, { component: 'api-route', action: 'api_request', details: user.id });
      return NextResponse.json(
        { error: 'Access denied to this calendar connection' },
        { status: 403 }
      );
    }

    // SECURITY: Verify user owns the connection OR is a space admin
    // Calendar connections contain OAuth tokens tied to a specific user's account
    const isOwner = connection.user_id === user.id;
    const isAdmin = spaceMember.role === 'admin' || spaceMember.role === 'owner';

    if (!isOwner && !isAdmin) {
      logger.error('[Calendar Sync] User does not own connection:', undefined, { component: 'api-route', action: 'api_request', details: user.id });
      return NextResponse.json(
        { error: 'You can only sync your own calendar connections' },
        { status: 403 }
      );
    }

    // Check if connection is in a syncable state
    if (connection.sync_status === 'disconnected') {
      return NextResponse.json(
        { error: 'Calendar connection is disconnected. Please reconnect first.' },
        { status: 400 }
      );
    }

    if (connection.sync_status === 'syncing') {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    // Check for rate limiting (prevent sync spam)
    if (connection.last_sync_at) {
      const lastSync = new Date(connection.last_sync_at);
      const minInterval = 60 * 1000; // 1 minute minimum between syncs
      if (Date.now() - lastSync.getTime() < minInterval) {
        return NextResponse.json(
          {
            error: 'Please wait before syncing again',
            retry_after: Math.ceil((minInterval - (Date.now() - lastSync.getTime())) / 1000),
          },
          { status: 429 }
        );
      }
    }

    // Perform the sync
    const syncResult = await calendarSyncService.performSync(
      validatedData.connection_id,
      validatedData.sync_type === 'full' ? 'full' : 'incremental'
    );

    const totalEvents = syncResult.events_created + syncResult.events_updated + syncResult.events_deleted;

    if (!syncResult.success) {
      return NextResponse.json(
        {
          error: 'Sync failed',
          details: syncResult.errors.length > 0 ? syncResult.errors[0].error_message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events_synced: totalEvents,
      events_created: syncResult.events_created,
      events_updated: syncResult.events_updated,
      events_deleted: syncResult.events_deleted,
      conflicts_detected: syncResult.conflicts_detected,
      message: `Sync completed successfully. ${totalEvents} events processed.`,
    });
  } catch (error) {
    logger.error('Calendar sync error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status and history
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validatedParams = GetQueryParamsSchema.parse({
      connection_id: searchParams.get('connection_id'),
      limit: searchParams.get('limit') || '10',
    });
    const { connection_id: connectionId, limit } = validatedParams;

    // Verify user has access to this connection
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('space_id, user_id')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    const { data: spaceMember } = await supabase
      .from('space_members')
      .select('id, role')
      .eq('space_id', connection.space_id)
      .eq('user_id', user.id)
      .single();

    if (!spaceMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // SECURITY: Verify user owns the connection OR is a space admin
    const isOwner = connection.user_id === user.id;
    const isAdmin = spaceMember.role === 'admin' || spaceMember.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only view your own calendar sync status' },
        { status: 403 }
      );
    }

    // Get sync history and pending conflicts count in parallel
    const [syncLogsResult, conflictsResult] = await Promise.all([
      supabase
        .from('calendar_sync_logs')
        .select('id, connection_id, sync_type, status, started_at, completed_at, events_created, events_updated, events_deleted, conflicts_detected, error_message')
        .eq('connection_id', connectionId)
        .order('started_at', { ascending: false })
        .limit(limit),
      supabase
        .from('calendar_sync_conflicts')
        .select('id', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .eq('resolution_status', 'detected'),
    ]);

    const { data: syncLogs, error: logsError } = syncLogsResult;
    const { count: conflictsCount } = conflictsResult;

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to fetch sync logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sync_logs: syncLogs || [],
      pending_conflicts: conflictsCount || 0,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Failed to get sync status:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
