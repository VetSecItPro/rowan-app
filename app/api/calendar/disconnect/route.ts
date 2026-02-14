// Calendar Disconnect API Route
// Phase 2: Disconnect and cleanup calendar connections

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DisconnectCalendarRequestSchema } from '@/lib/validations/calendar-integration-schemas';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

/** Disconnects and removes a calendar provider connection */
export async function POST(request: NextRequest) {
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

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = DisconnectCalendarRequestSchema.parse(body);

    // Get the connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', validatedData.connection_id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    // Verify user has access to the space
    const { data: spaceMember, error: memberError } = await supabase
      .from('space_members')
      .select('id, role')
      .eq('space_id', connection.space_id)
      .eq('user_id', user.id)
      .single();

    logger.info('[Disconnect] Space member check:', { component: 'api-route', data: {
      spaceId: connection.space_id,
      userId: user.id,
      spaceMember,
      memberError
    } });

    if (!spaceMember) {
      return NextResponse.json(
        { error: 'Access denied to this calendar connection', debug: { memberError } },
        { status: 403 }
      );
    }

    // Only connection owner or space admin can disconnect
    const isOwner = connection.user_id === user.id;
    const isAdmin = spaceMember.role === 'admin' || spaceMember.role === 'owner';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the connection owner or space admin can disconnect' },
        { status: 403 }
      );
    }

    // Begin cleanup process
    let eventsUnsynced = 0;

    if (validatedData.delete_synced_events) {
      // Get event mappings to identify synced events
      const { data: mappings } = await supabase
        .from('calendar_event_mappings')
        .select('rowan_event_id')
        .eq('connection_id', validatedData.connection_id);

      if (mappings && mappings.length > 0) {
        // Remove external_source from these events but keep the events
        const rowanEventIds = mappings.map((m: { rowan_event_id: string }) => m.rowan_event_id);
        const { error: updateError } = await supabase
          .from('events')
          .update({
            external_source: null,
            sync_locked: false,
            last_external_sync: null,
          })
          .in('id', rowanEventIds);

        if (!updateError) {
          eventsUnsynced = rowanEventIds.length;
        }
      }
    }

    // Delete webhook subscriptions
    await supabase
      .from('calendar_webhook_subscriptions')
      .delete()
      .eq('connection_id', validatedData.connection_id);

    // Delete sync queue entries
    await supabase
      .from('calendar_sync_queue')
      .delete()
      .eq('connection_id', validatedData.connection_id);

    // Delete sync conflicts
    await supabase
      .from('calendar_sync_conflicts')
      .delete()
      .eq('connection_id', validatedData.connection_id);

    // Delete event mappings
    await supabase
      .from('calendar_event_mappings')
      .delete()
      .eq('connection_id', validatedData.connection_id);

    // Delete sync logs
    await supabase
      .from('calendar_sync_logs')
      .delete()
      .eq('connection_id', validatedData.connection_id);

    // Delete OAuth tokens from vault
    await supabase.rpc('delete_oauth_tokens', {
      p_connection_id: validatedData.connection_id,
    });

    // Delete the connection record
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', validatedData.connection_id);

    if (deleteError) {
      logger.error('Failed to delete connection:', deleteError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to disconnect calendar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar disconnected successfully',
      events_unsynced: eventsUnsynced,
      provider: connection.provider,
    });
  } catch (error) {
    logger.error('Calendar disconnect error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
