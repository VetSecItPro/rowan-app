// Microsoft Outlook Calendar OAuth Callback API Route
// Phase 4: Handles OAuth callback from Microsoft and exchanges code for tokens

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { outlookCalendarService } from '@/lib/services/calendar';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getAppUrl } from '@/lib/utils/app-url';

// Validation schema for Outlook OAuth callback
const OutlookOAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

interface OAuthState {
  connection_id: string;
  space_id: string;
  user_id: string;
  nonce?: string; // For replay protection
  timestamp?: number; // For expiration check
}

// OAuth state expiration time (10 minutes)
const OAUTH_STATE_EXPIRATION_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseUrl = getAppUrl();

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
      // SECURITY: Log the detailed error for debugging but don't expose to user (L11)
      logger.warn('Microsoft OAuth error', {
        component: 'calendar/callback/outlook',
        action: 'oauth_error',
        errorType: params.error,
        errorDescription: params.error_description
      });

      // Redirect to calendar settings with generic error (don't leak OAuth provider details)
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'outlook_auth_denied');
      // Use generic message to prevent information disclosure
      errorUrl.searchParams.set('message', 'Authorization was denied or cancelled');

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
      logger.warn('Invalid OAuth state', { component: 'calendar/callback/outlook', action: 'invalid_state' });
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
      // User not logged in, redirect to login
      // Security: We don't pass the full callback URL as redirect to prevent open redirect attacks
      // After login, user will need to reconnect their calendar from settings
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('returnTo', '/settings?tab=integrations&reconnect=outlook');
      return NextResponse.redirect(loginUrl);
    }

    // Verify the state matches the current user
    if (oauthState.user_id !== user.id) {
      logger.warn('OAuth state user mismatch', { component: 'calendar/callback/outlook', action: 'user_mismatch' });
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
      logger.warn('Connection not found', { component: 'calendar/callback/outlook', action: 'connection_not_found' });
      const errorUrl = new URL('/settings', baseUrl);
      errorUrl.searchParams.set('tab', 'integrations');
      errorUrl.searchParams.set('error', 'connection_not_found');
      return NextResponse.redirect(errorUrl);
    }

    // SECURITY: Verify nonce and timestamp to prevent replay attacks
    if (oauthState.nonce && oauthState.timestamp) {
      // Check if state has expired (10 minute window)
      if (Date.now() - oauthState.timestamp > OAUTH_STATE_EXPIRATION_MS) {
        logger.warn('OAuth state expired', { component: 'calendar/callback/outlook', action: 'state_expired' });
        const errorUrl = new URL('/settings', baseUrl);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'state_expired');
        return NextResponse.redirect(errorUrl);
      }

      // Verify nonce matches what we stored in the connection record
      if (connection.oauth_state_nonce !== oauthState.nonce) {
        logger.warn('OAuth state nonce mismatch - possible replay attack', {
          component: 'calendar/callback/outlook',
          action: 'nonce_mismatch',
        });
        const errorUrl = new URL('/settings', baseUrl);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'invalid_state');
        return NextResponse.redirect(errorUrl);
      }

      // Clear the nonce after successful verification (one-time use)
      await supabase
        .from('calendar_connections')
        .update({
          oauth_state_nonce: null,
          oauth_state_created_at: null,
        })
        .eq('id', connection.id);
    }

    // Exchange authorization code for tokens
    let tokenData;
    try {
      tokenData = await outlookCalendarService.exchangeCodeForTokens(validated.code);
    } catch (tokenError) {
      logger.warn('Token exchange failed', { component: 'calendar/callback/outlook', action: 'token_exchange_failed' });

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
      logger.warn('Failed to get user profile', {
        component: 'calendar/callback/outlook',
        action: 'profile_fetch_failed',
        error: profileError instanceof Error ? profileError.message : 'Unknown error',
      });
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
      logger.warn('Failed to queue existing events', { component: 'calendar/callback/outlook', action: 'queue_events_failed' });
      // Don't fail the whole flow - just log it
    } else {
      logger.debug('Queued existing events for sync', { component: 'calendar/callback/outlook', action: 'events_queued', count: queuedCount });
    }

    // Redirect to calendar settings with success message
    const successUrl = new URL('/settings', baseUrl);
    successUrl.searchParams.set('tab', 'integrations');
    successUrl.searchParams.set('success', 'outlook_connected');
    successUrl.searchParams.set('connection_id', oauthState.connection_id);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    logger.error('Microsoft OAuth callback error', error, { component: 'calendar/callback/outlook', action: 'callback_failed' });

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
