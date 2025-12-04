// Calendar Sync API Route
// Phase 2: Manual sync trigger for calendar connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calendarSyncService } from '@/lib/services/calendar';
import { ManualSyncRequestSchema } from '@/lib/validations/calendar-integration-schemas';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  console.log('[Calendar Sync] POST request received');

  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[Calendar Sync] Auth check:', { userId: user?.id, authError: authError?.message });

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('[Calendar Sync] Request body:', body);
    const validatedData = ManualSyncRequestSchema.parse(body);

    // Verify connection exists
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', validatedData.connection_id)
      .single();

    if (connectionError || !connection) {
      console.error('[Calendar Sync] Connection not found:', connectionError);
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
      console.error('[Calendar Sync] Access denied for user:', user.id);
      return NextResponse.json(
        { error: 'Access denied to this calendar connection' },
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
    console.error('Calendar sync error:', error);

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

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connection_id is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this connection
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('space_id')
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
      .select('id')
      .eq('space_id', connection.space_id)
      .eq('user_id', user.id)
      .single();

    if (!spaceMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get sync history
    const { data: syncLogs, error: logsError } = await supabase
      .from('calendar_sync_logs')
      .select('*')
      .eq('connection_id', connectionId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to fetch sync logs' },
        { status: 500 }
      );
    }

    // Get pending conflicts count
    const { count: conflictsCount } = await supabase
      .from('calendar_sync_conflicts')
      .select('id', { count: 'exact', head: true })
      .eq('connection_id', connectionId)
      .eq('resolution_status', 'detected');

    return NextResponse.json({
      success: true,
      sync_logs: syncLogs || [],
      pending_conflicts: conflictsCount || 0,
    });
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}
