// Microsoft Outlook Calendar OAuth Connect API Route
// Phase 4: Initiates OAuth flow for Microsoft Outlook Calendar connection

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { outlookCalendarService } from '@/lib/services/calendar';
import { ConnectCalendarRequestSchema } from '@/lib/validations/calendar-integration-schemas';
import { z } from 'zod';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

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
    const validatedData = ConnectCalendarRequestSchema.parse({
      ...body,
      provider: 'outlook',
    });

    // Verify user has access to the space
    logger.info('[Outlook Connect] Checking space access:', { component: 'api-route', data: {
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
      logger.error('[Outlook Connect] Space access denied:', undefined, { component: 'api-route', action: 'api_request', details: {
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

    logger.info('[Outlook Connect] Space access confirmed:', { component: 'api-route', data: spaceMember });

    // Check for existing active connection
    const { data: activeConnection } = await supabase
      .from('calendar_connections')
      .select('id, sync_status')
      .eq('space_id', validatedData.space_id)
      .eq('provider', 'outlook')
      .eq('user_id', user.id)
      .in('sync_status', ['active', 'syncing', 'token_expired'])
      .single();

    if (activeConnection) {
      return NextResponse.json(
        {
          error: 'Microsoft Outlook Calendar is already connected to this space',
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
      .eq('provider', 'outlook')
      .eq('user_id', user.id)
      .eq('sync_status', 'disconnected')
      .single();

    let connection;

    if (disconnectedConnection) {
      // Reuse existing disconnected connection
      logger.info('[Outlook Connect] Reusing disconnected connection:', { component: 'api-route', data: disconnectedConnection.id });
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
        logger.error('Failed to update connection:', updateError, { component: 'api-route', action: 'api_request' });
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
          provider: 'outlook',
          sync_direction: validatedData.sync_direction,
          sync_status: 'disconnected', // Will be updated after OAuth callback
          sync_enabled: true,
        })
        .select()
        .single();

      if (connectionError) {
        logger.error('Failed to create connection:', connectionError, { component: 'api-route', action: 'api_request' });
        return NextResponse.json(
          { error: 'Failed to create calendar connection' },
          { status: 500 }
        );
      }
      connection = newConnection;
    }

    // Create state parameter for OAuth (includes connection ID for callback)
    // SECURITY: Include nonce and timestamp to prevent replay attacks
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({
        connection_id: connection.id,
        space_id: validatedData.space_id,
        user_id: user.id,
        nonce, // Unique per request
        timestamp: Date.now(), // For expiration check in callback
      })
    ).toString('base64url');

    // Store nonce in connection record for verification in callback
    await supabase
      .from('calendar_connections')
      .update({
        oauth_state_nonce: nonce,
        oauth_state_created_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    // Generate Microsoft OAuth URL with optional login_hint for pre-selecting account
    const authUrl = outlookCalendarService.generateAuthUrl(state, validatedData.login_hint);

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
      connection_id: connection.id,
      message: 'Redirect user to auth_url to complete Microsoft Outlook Calendar connection',
    });
  } catch (error) {
    logger.error('Microsoft OAuth connect error:', error, { component: 'api-route', action: 'api_request' });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate Microsoft Outlook Calendar connection' },
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

    // Get all Outlook Calendar connections for this space
    const { data: connections, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('space_id', spaceId)
      .eq('provider', 'outlook')
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
    logger.error('Failed to get Outlook connections:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch Microsoft Outlook Calendar connections' },
      { status: 500 }
    );
  }
}
