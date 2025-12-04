// Cozi Calendar Connect API Route
// Cozi uses ICS feeds for export - this is a branded wrapper around ICS import

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { icsImportService } from '@/lib/services/calendar';
import { z } from 'zod';
import type { ICSFeedConfig } from '@/lib/types/calendar-integration';

// Validation schema for Cozi connection
const CoziConnectSchema = z.object({
  space_id: z.string().uuid('Invalid space ID'),
  url: z.string().url('Invalid URL format'),
  family_member: z.string().min(1, 'Family member name is required').max(100, 'Name too long').optional(),
});

export async function POST(request: NextRequest) {
  try {
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
    const validatedData = CoziConnectSchema.parse(body);

    // Validate and normalize URL (Cozi URLs should be ICS format)
    const urlValidation = icsImportService.validateICSUrl(validatedData.url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Validate it's a Cozi URL
    const normalizedUrl = urlValidation.normalizedUrl.toLowerCase();
    if (!normalizedUrl.includes('cozi.com') && !normalizedUrl.includes('cozi.family')) {
      return NextResponse.json(
        {
          error: 'This does not appear to be a Cozi calendar URL. Please copy the URL from your Cozi Shared Calendars settings.',
          hint: 'Cozi URLs typically contain "cozi.com" in the address.',
        },
        { status: 400 }
      );
    }

    // Verify user has access to the space
    console.log('[Cozi Connect] Checking space access:', {
      space_id: validatedData.space_id,
      user_id: user.id,
    });

    const { data: spaceMember, error: spaceError } = await supabase
      .from('space_members')
      .select('space_id, role')
      .eq('space_id', validatedData.space_id)
      .eq('user_id', user.id)
      .single();

    if (spaceError || !spaceMember) {
      console.error('[Cozi Connect] Space access denied:', {
        spaceError,
        spaceMember,
        space_id: validatedData.space_id,
        user_id: user.id,
      });
      return NextResponse.json(
        { error: 'Space not found or access denied' },
        { status: 403 }
      );
    }

    console.log('[Cozi Connect] Space access confirmed:', spaceMember);

    // Test the Cozi ICS feed before creating connection
    console.log('[Cozi Connect] Testing Cozi feed:', urlValidation.normalizedUrl);
    const testResult = await icsImportService.testICSFeed(urlValidation.normalizedUrl);

    if (!testResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to validate Cozi calendar',
          details: testResult.error,
          hint: 'Make sure calendar sharing is enabled in your Cozi settings.',
        },
        { status: 400 }
      );
    }

    console.log('[Cozi Connect] Feed test passed:', {
      eventCount: testResult.eventCount,
      calendarName: testResult.calendarName,
    });

    // Check for existing active Cozi connection
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'cozi')
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
            error: 'This Cozi calendar is already connected to this space',
            existing_connection_id: existingConnection.id,
          },
          { status: 409 }
        );
      }
    }

    // Determine calendar name
    const calendarName = validatedData.family_member
      ? `Cozi - ${validatedData.family_member}`
      : testResult.calendarName || 'Cozi Family Calendar';

    // Create Cozi feed config (same structure as ICS, stored as 'cozi' provider)
    const feedConfig: ICSFeedConfig = {
      url: urlValidation.normalizedUrl,
      name: calendarName,
      refresh_interval_minutes: 15,
    };

    // Create the connection with 'cozi' provider
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        space_id: validatedData.space_id,
        user_id: user.id,
        provider: 'cozi', // Use 'cozi' provider instead of 'ics'
        sync_direction: 'inbound', // Cozi is always inbound-only
        sync_status: 'active',
        sync_enabled: true,
        provider_config: feedConfig,
        provider_account_id: calendarName,
        next_sync_at: new Date().toISOString(), // Sync immediately
      })
      .select()
      .single();

    if (connectionError) {
      console.error('[Cozi Connect] Failed to create connection:', connectionError);
      return NextResponse.json(
        { error: 'Failed to create calendar connection' },
        { status: 500 }
      );
    }

    console.log('[Cozi Connect] Connection created:', connection.id);

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

    // Trigger initial sync using the ICS service (works for Cozi too)
    console.log('[Cozi Connect] Triggering initial sync...');
    const syncResult = await icsImportService.syncICSFeed(connection.id, true);

    return NextResponse.json({
      success: true,
      connection_id: connection.id,
      calendar_name: calendarName,
      event_count: testResult.eventCount,
      initial_sync: {
        success: syncResult.success,
        events_imported: syncResult.eventsProcessed,
      },
      message: `Successfully connected Cozi calendar with ${testResult.eventCount} events`,
    });
  } catch (error) {
    console.error('[Cozi Connect] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect Cozi calendar' },
      { status: 500 }
    );
  }
}

// GET endpoint to check Cozi connection status
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
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Get all Cozi connections for this space
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('space_id', spaceId)
      .eq('provider', 'cozi')
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
    console.error('[Cozi Connect] Failed to get connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Cozi connections' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a Cozi connection
export async function DELETE(request: NextRequest) {
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
      .eq('provider', 'cozi')
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
      message: 'Cozi calendar disconnected successfully',
    });
  } catch (error) {
    console.error('[Cozi Connect] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Cozi calendar' },
      { status: 500 }
    );
  }
}
