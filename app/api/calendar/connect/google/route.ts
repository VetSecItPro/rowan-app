// Google Calendar OAuth Connect API Route
// Phase 2: Initiates OAuth flow for Google Calendar connection

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleCalendarService } from '@/lib/services/calendar';
import { ConnectCalendarRequestSchema } from '@/lib/validations/calendar-integration-schemas';
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ConnectCalendarRequestSchema.parse({
      ...body,
      provider: 'google',
    });

    // Verify user has access to the space
    console.log('[Calendar Connect] Checking space access:', {
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
      console.error('[Calendar Connect] Space access denied:', {
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

    console.log('[Calendar Connect] Space access confirmed:', spaceMember);

    // Check for existing active connection
    const { data: activeConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .in('sync_status', ['active', 'syncing', 'token_expired'])
      .single();

    if (activeConnection) {
      return NextResponse.json(
        {
          error: 'Google Calendar is already connected to this space',
          existing_connection_id: activeConnection.id,
          status: activeConnection.sync_status,
        },
        { status: 409 }
      );
    }

    // Check for existing disconnected connection to reuse
    const { data: disconnectedConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'google')
      .eq('user_id', user.id)
      .eq('sync_status', 'disconnected')
      .single();

    let connection;

    if (disconnectedConnection) {
      // Reuse existing disconnected connection
      console.log('[Calendar Connect] Reusing disconnected connection:', disconnectedConnection.id);
      const { data: updatedConnection, error: updateError } = await supabase
        .from('calendar_connections')
        .update({
          sync_direction: validatedData.sync_direction,
          sync_enabled: true,
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
          provider: 'google',
          sync_direction: validatedData.sync_direction,
          sync_status: 'disconnected', // Will be updated after OAuth callback
          sync_enabled: true,
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

    // Create state parameter for OAuth (includes connection ID for callback)
    const state = Buffer.from(
      JSON.stringify({
        connection_id: connection.id,
        space_id: validatedData.space_id,
        user_id: user.id,
      })
    ).toString('base64url');

    // Generate Google OAuth URL with optional login_hint for pre-selecting account
    const authUrl = googleCalendarService.generateAuthUrl(state, validatedData.login_hint);

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
      connection_id: connection.id,
      message: 'Redirect user to auth_url to complete Google Calendar connection',
    });
  } catch (error) {
    console.error('Google OAuth connect error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar connection' },
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

    // Get all Google Calendar connections for this space
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('space_id', spaceId)
      .eq('provider', 'google')
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
    console.error('Failed to get Google connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Calendar connections' },
      { status: 500 }
    );
  }
}
