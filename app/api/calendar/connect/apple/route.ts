// Apple Calendar CalDAV Connect API Route
// Phase 3: Handles Apple Calendar connection via app-specific password

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appleCalDAVService } from '@/lib/services/calendar';
import { AppleCalDAVCredentialsSchema } from '@/lib/validations/calendar-integration-schemas';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AppleCalDAVCredentialsSchema.parse(body);

    // Verify user has access to the space
    console.log('[Apple Calendar Connect] Checking space access:', {
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
      console.error('[Apple Calendar Connect] Space access denied:', {
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

    console.log('[Apple Calendar Connect] Space access confirmed:', spaceMember);

    // Check for existing active connection
    const { data: activeConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'apple')
      .eq('user_id', user.id)
      .in('sync_status', ['active', 'syncing', 'token_expired'])
      .single();

    if (activeConnection) {
      return NextResponse.json(
        {
          error: 'Apple Calendar is already connected to this space',
          existing_connection_id: activeConnection.id,
          status: activeConnection.sync_status,
        },
        { status: 409 }
      );
    }

    // Validate credentials with Apple CalDAV server
    console.log('[Apple Calendar Connect] Validating credentials...');
    const validation = await appleCalDAVService.validateAppleCredentials(
      validatedData.email,
      validatedData.app_specific_password
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid Apple Calendar credentials',
          details: validation.error,
        },
        { status: 400 }
      );
    }

    console.log('[Apple Calendar Connect] Credentials validated, found', validation.calendars?.length, 'calendars');

    // Check for existing disconnected connection to reuse
    const { data: disconnectedConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'apple')
      .eq('user_id', user.id)
      .eq('sync_status', 'disconnected')
      .single();

    let connection;

    if (disconnectedConnection) {
      // Reuse existing disconnected connection
      console.log('[Apple Calendar Connect] Reusing disconnected connection:', disconnectedConnection.id);
      const { data: updatedConnection, error: updateError } = await supabase
        .from('calendar_connections')
        .update({
          sync_direction: validatedData.sync_direction,
          sync_enabled: true,
          provider_calendar_id: validation.calendars?.[0]?.url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', disconnectedConnection.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update connection:', updateError);
        return NextResponse.json(
          { error: 'Failed to update calendar connection' },
          { status: 500 }
        );
      }
      connection = updatedConnection;
    } else {
      // Create a new connection record
      const { data: newConnection, error: connectionError } = await supabase
        .from('calendar_connections')
        .insert({
          space_id: validatedData.space_id,
          user_id: user.id,
          provider: 'apple',
          sync_direction: validatedData.sync_direction,
          sync_status: 'disconnected', // Will be updated after storing credentials
          sync_enabled: true,
          provider_calendar_id: validation.calendars?.[0]?.url || null,
        })
        .select()
        .single();

      if (connectionError) {
        console.error('Failed to create connection:', connectionError);
        return NextResponse.json(
          { error: 'Failed to create calendar connection' },
          { status: 500 }
        );
      }
      connection = newConnection;
    }

    // Store credentials securely in vault
    console.log('[Apple Calendar Connect] Storing credentials securely...');
    try {
      await appleCalDAVService.storeAppleCredentials(
        connection.id,
        validatedData.email,
        validatedData.app_specific_password
      );
    } catch (credentialError) {
      console.error('Failed to store credentials:', credentialError);
      // Clean up the connection if credential storage fails
      await supabase.from('calendar_connections').delete().eq('id', connection.id);
      return NextResponse.json(
        { error: 'Failed to store credentials securely' },
        { status: 500 }
      );
    }

    // Calculate next sync time (15 minutes from now)
    const nextSync = new Date();
    nextSync.setMinutes(nextSync.getMinutes() + 15);

    // Update connection status to active
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'active',
        last_sync_at: new Date().toISOString(),
        next_sync_at: nextSync.toISOString(),
      })
      .eq('id', connection.id);

    return NextResponse.json({
      success: true,
      connection_id: connection.id,
      calendars: validation.calendars,
      message: 'Apple Calendar connected successfully. Initial sync will begin shortly.',
    });
  } catch (error) {
    console.error('Apple Calendar connect error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to connect Apple Calendar' },
      { status: 500 }
    );
  }
}

// GET endpoint to check connection status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Get all Apple Calendar connections for this space
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('space_id', spaceId)
      .eq('provider', 'apple')
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
    console.error('Failed to get Apple connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Apple Calendar connections' },
      { status: 500 }
    );
  }
}
