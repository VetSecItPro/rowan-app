// Microsoft Outlook Calendar OAuth Callback API Route
// Phase 4: Handles OAuth callback from Microsoft and exchanges code for tokens

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { outlookCalendarService } from '@/lib/services/calendar';
import { z } from 'zod';

// Validation schema for Outlook OAuth callback
const OutlookOAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

interface OAuthState {
  connection_id: string;
  space_id: string;
  user_id: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    // Parse and validate callback parameters
    const params = {
      code: searchParams.get('code') || '',
      state: searchParams.get('state') || '',
      error: searchParams.get('error') || undefined,
      error_description: searchParams.get('error_description') || undefined,
    };

    // Handle OAuth errors from Microsoft
    if (params.error) {
      console.error('Microsoft OAuth error:', params.error, params.error_description);

      // Redirect to calendar settings with error
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'outlook_auth_denied');
      errorUrl.searchParams.set('message', params.error_description || 'Authorization was denied');

      return NextResponse.redirect(errorUrl);
    }

    // Validate required parameters
    const validated = OutlookOAuthCallbackSchema.parse(params);

    // Decode and validate state
    let oauthState: OAuthState;
    try {
      const stateJson = Buffer.from(validated.state, 'base64url').toString('utf-8');
      oauthState = JSON.parse(stateJson) as OAuthState;
    } catch {
      console.error('Invalid OAuth state');
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(errorUrl);
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // User not logged in, redirect to login with return URL
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('redirect', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verify the state matches the current user
    if (oauthState.user_id !== user.id) {
      console.error('OAuth state user mismatch');
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'user_mismatch');
      return NextResponse.redirect(errorUrl);
    }

    // Verify the connection exists and belongs to this user
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', oauthState.connection_id)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError);
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'connection_not_found');
      return NextResponse.redirect(errorUrl);
    }

    // Exchange authorization code for tokens
    let tokenData;
    try {
      tokenData = await outlookCalendarService.exchangeCodeForTokens(validated.code);
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError);

      // Update connection status to error
      await supabase
        .from('calendar_connections')
        .update({
          sync_status: 'error',
          last_error_message: tokenError instanceof Error ? tokenError.message : 'Token exchange failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', oauthState.connection_id);

      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(errorUrl);
    }

    // Store tokens securely
    await outlookCalendarService.storeTokens(
      oauthState.connection_id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    // Get user profile to store account identifier
    let userProfile;
    try {
      userProfile = await outlookCalendarService.getUserProfile(oauthState.connection_id);
    } catch (profileError) {
      console.error('Failed to get user profile:', profileError);
      // Continue without profile - not critical
    }

    // Update connection status to active
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'active',
        provider_account_id: userProfile?.mail || userProfile?.userPrincipalName || null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
        // Set next sync to now to trigger initial sync
        next_sync_at: new Date().toISOString(),
      })
      .eq('id', oauthState.connection_id);

    // Log successful connection
    await supabase.from('calendar_sync_logs').insert({
      connection_id: oauthState.connection_id,
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

    // Queue all existing events in the space for outbound sync
    const { data: queuedCount, error: queueError } = await supabase.rpc(
      'queue_existing_events_for_sync',
      { p_connection_id: oauthState.connection_id }
    );

    if (queueError) {
      console.error('Failed to queue existing events:', queueError);
      // Don't fail the whole flow - just log it
    } else {
      console.log(`Queued ${queuedCount} existing events for sync to Outlook Calendar`);
    }

    // Redirect to calendar settings with success message
    const successUrl = new URL('/settings', baseUrl);
    successUrl.searchParams.set('tab', 'integrations');
    successUrl.searchParams.set('success', 'outlook_connected');
    successUrl.searchParams.set('connection_id', oauthState.connection_id);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);

    if (error instanceof z.ZodError) {
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'invalid_callback');
      return NextResponse.redirect(errorUrl);
    }

    const errorUrl = new URL('/settings', baseUrl);
    errorUrl.searchParams.set('tab', 'integrations');
    errorUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(errorUrl);
  }
}
