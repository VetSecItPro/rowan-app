// ICS Feed Connect API Route
// Phase 5: Handles ICS feed URL connection and validation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { icsImportService } from '@/lib/services/calendar';
import { z } from 'zod';
import type { ICSFeedConfig } from '@/lib/types/calendar-integration';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';

// Validation schema for ICS feed connection
const ICSConnectSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  url: z.string().url('Invalid URL format'),
  name: z.string().min(1, 'Feed name is required').max(100, 'Feed name too long'),
});

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
    const validatedData = ICSConnectSchema.parse(body);

    // Validate and normalize URL
    const urlValidation = icsImportService.validateICSUrl(validatedData.url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Verify user has access to the space
    logger.info('[ICS Connect] Checking space access:', { component: 'api-route', data: {
      space_id: validatedData.space_id,
      user_id: user.id,
    } });

    const { data: spaceMember, error: spaceError } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('space_id', validatedData.space_id)
      .eq('user_id', user.id)
      .single();

    if (spaceError || !spaceMember) {
      logger.error('[ICS Connect] Space access denied:', undefined, { component: 'api-route', action: 'api_request', details: {
        spaceError,
        spaceMember,
        space_id: validatedData.space_id,
        user_id: user.id,
      } });
      return NextResponse.json(
        { error: 'Space not found or access denied' },
        { status: 403 }
      );
    }

    logger.info('[ICS Connect] Space access confirmed:', { component: 'api-route', data: spaceMember });

    // Test the ICS feed before creating connection
    logger.info('[ICS Connect] Testing ICS feed:', { component: 'api-route', data: urlValidation.normalizedUrl });
    const testResult = await icsImportService.testICSFeed(urlValidation.normalizedUrl);

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to validate ICS feed',
          details: testResult.error,
        },
        { status: 400 }
      );
    }

    logger.info('[ICS Connect] Feed test passed:', { component: 'api-route', data: {
      eventCount: testResult.eventCount,
      calendarName: testResult.calendarName,
    } });

    // Check for existing active connection with same URL
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'ics')
      .eq('user_id', user.id)
      .in('sync_status', ['active', 'syncing'])
      .single();

    // Check if existing connection has the same URL
    if (existingConnection) {
      const { data: existingConfig } = await supabase
        .from('calendar_connections')
        .select('provider_config')
        .eq('id', existingConnection.id)
        .single();

      const config = existingConfig?.provider_config as ICSFeedConfig | null;
      if (config?.url === urlValidation.normalizedUrl) {
        return NextResponse.json(
          {
            error: 'This ICS feed is already connected to this space',
            existing_connection_id: existingConnection.id,
          },
          { status: 409 }
        );
      }
    }

    // Create ICS feed config
    const feedConfig: ICSFeedConfig = {
      url: urlValidation.normalizedUrl,
      name: validatedData.name || testResult.calendarName || 'ICS Calendar',
      refresh_interval_minutes: 15,
    };

    // Create the connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        space_id: validatedData.space_id,
        user_id: user.id,
        provider: 'ics',
        sync_direction: 'inbound', // ICS is always inbound-only
        sync_status: 'active',
        sync_enabled: true,
        provider_config: feedConfig,
        provider_account_id: feedConfig.name, // Use feed name as account identifier
        next_sync_at: new Date().toISOString(), // Sync immediately
      })
      .select()
      .single();

    if (connectionError) {
      logger.error('[ICS Connect] Failed to create connection:', connectionError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to create calendar connection' },
        { status: 500 }
      );
    }

    logger.info('[ICS Connect] Connection created:', { component: 'api-route', data: connection.id });

    // Log successful connection
    await supabase.from('calendar_sync_logs').insert({
      connection_id: connection.id,
      sync_type: 'manual',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      events_synced: 0,
      events_created: 0,
      events_updated: 0,
      events_deleted: 0,
      errors: [],
    });

    // Trigger initial sync
    logger.info('[ICS Connect] Triggering initial sync...', { component: 'api-route' });
    const syncResult = await icsImportService.syncICSFeed(connection.id, true);

    return NextResponse.json({
      success: true,
      connection_id: connection.id,
      feed_name: feedConfig.name,
      event_count: testResult.eventCount,
      initial_sync: {
        success: syncResult.success,
        events_imported: syncResult.eventsProcessed,
      },
      message: `Successfully connected ICS feed with ${testResult.eventCount} events`,
    });
  } catch (error) {
    logger.error('[ICS Connect] Error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect ICS feed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check connection status
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

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Get all ICS connections for this space
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('space_id', spaceId)
      .eq('provider', 'ics')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connections: connections || [],
    });
  } catch (error) {
    logger.error('[ICS Connect] Failed to get connections:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch ICS feed connections' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove an ICS connection
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'connection_id is required' },
        { status: 400 }
      );
    }

    // Verify connection exists and belongs to user
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('id, user_id, provider')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .eq('provider', 'ics')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Delete associated event mappings first
    await supabase
      .from('calendar_event_mappings')
      .delete()
      .eq('connection_id', connectionId);

    // Delete sync logs
    await supabase
      .from('calendar_sync_logs')
      .delete()
      .eq('connection_id', connectionId);

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('calendar_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ICS feed disconnected successfully',
    });
  } catch (error) {
    logger.error('[ICS Connect] Delete error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to disconnect ICS feed' },
      { status: 500 }
    );
  }
}
