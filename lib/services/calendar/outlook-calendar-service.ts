// Microsoft Outlook Calendar Service
// Phase 4: OAuth flow, Microsoft Graph API wrapper, and sync operations

import { createClient } from '@/lib/supabase/server';
import type {
  CalendarConnection,
  OutlookCalendarEvent,
  OutlookCalendar,
  OutlookDeltaResponse,
  SyncResult,
  TokenRefreshResult,
} from '@/lib/types/calendar-integration';

// =============================================================================
// CONFIGURATION
// =============================================================================

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI;

// Microsoft Identity Platform endpoints
const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';
const MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// OAuth scopes for Microsoft Graph Calendar API
const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.ReadWrite',
  'User.Read',
];

// Webhook settings (max 4230 minutes = ~2.94 days for Graph API)
const WEBHOOK_TTL_MINUTES = 4230;

// =============================================================================
// OAUTH URL GENERATION
// =============================================================================

/**
 * Generate the Microsoft OAuth authorization URL
 */
export function generateAuthUrl(state: string, loginHint?: string): string {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_REDIRECT_URI) {
    throw new Error('Microsoft Calendar credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES.join(' '),
    state,
    prompt: 'consent', // Force consent to always get refresh token
  });

  if (loginHint) {
    params.append('login_hint', loginHint);
  }

  return `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
}

// =============================================================================
// TOKEN EXCHANGE AND MANAGEMENT
// =============================================================================

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_REDIRECT_URI) {
    throw new Error('Microsoft Calendar credentials not configured');
  }

  const tokenUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: MICROSOFT_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: SCOPES.join(' '),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[Outlook OAuth] Token exchange failed:', errorData);
    throw new Error(errorData.error_description || 'Failed to exchange code for tokens');
  }

  return response.json();
}

/**
 * Store OAuth tokens securely in vault
 */
export async function storeTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn?: number
): Promise<void> {
  const supabase = await createClient();

  // Store access token
  const { error: accessError } = await supabase.rpc('store_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'access_token',
    p_token_value: accessToken,
    p_description: 'Microsoft Outlook access token',
  });

  if (accessError) {
    console.error('[Outlook] Failed to store access token:', accessError);
    throw new Error('Failed to store access token');
  }

  // Store refresh token
  const { error: refreshError } = await supabase.rpc('store_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'refresh_token',
    p_token_value: refreshToken,
    p_description: 'Microsoft Outlook refresh token',
  });

  if (refreshError) {
    console.error('[Outlook] Failed to store refresh token:', refreshError);
    throw new Error('Failed to store refresh token');
  }

  // Update token expiry in connection
  if (expiresIn) {
    await supabase.rpc('update_token_expiry', {
      p_connection_id: connectionId,
      p_expires_in_seconds: expiresIn,
    });
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(connectionId: string): Promise<TokenRefreshResult> {
  try {
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new Error('Microsoft Calendar credentials not configured');
    }

    const supabase = await createClient();

    // Get refresh token from vault
    const { data: refreshToken, error: refreshError } = await supabase.rpc('get_oauth_token', {
      p_connection_id: connectionId,
      p_token_type: 'refresh_token',
    });

    if (refreshError || !refreshToken) {
      console.error('[Outlook] Failed to get refresh token:', refreshError);
      return { success: false, error: 'Failed to retrieve refresh token' };
    }

    const tokenUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: SCOPES.join(' '),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Outlook] Token refresh failed:', errorData);

      // Mark connection as token_expired if refresh fails
      await supabase
        .from('calendar_connections')
        .update({ sync_status: 'token_expired' })
        .eq('id', connectionId);

      return {
        success: false,
        error: errorData.error_description || 'Failed to refresh token',
      };
    }

    const tokens: TokenResponse = await response.json();

    // Store new tokens
    await storeTokens(
      connectionId,
      tokens.access_token,
      tokens.refresh_token || refreshToken, // Use old refresh token if new one not provided
      tokens.expires_in
    );

    return { success: true };
  } catch (error) {
    console.error('[Outlook] Token refresh error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error refreshing token',
    };
  }
}

/**
 * Get an authenticated access token for API calls
 */
async function getAccessToken(connectionId: string): Promise<string> {
  const supabase = await createClient();

  const { data: accessToken, error } = await supabase.rpc('get_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'access_token',
  });

  if (error || !accessToken) {
    throw new Error('Failed to retrieve access token');
  }

  return accessToken;
}

// =============================================================================
// USER PROFILE
// =============================================================================

interface MicrosoftUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

/**
 * Get the current user's profile from Microsoft Graph
 */
export async function getUserProfile(connectionId: string): Promise<MicrosoftUser> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token and retry
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return getUserProfile(connectionId);
      }
    }
    throw new Error('Failed to get user profile');
  }

  return response.json();
}

// =============================================================================
// CALENDAR OPERATIONS
// =============================================================================

/**
 * List all calendars for the user
 */
export async function listCalendars(connectionId: string): Promise<OutlookCalendar[]> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me/calendars`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return listCalendars(connectionId);
      }
    }
    throw new Error('Failed to list calendars');
  }

  const data = await response.json();
  return data.value || [];
}

/**
 * Get events from the default calendar with optional delta sync support
 */
export async function getEvents(
  connectionId: string,
  options: {
    deltaLink?: string;
    startDateTime?: string;
    endDateTime?: string;
    maxResults?: number;
  } = {}
): Promise<OutlookDeltaResponse> {
  const accessToken = await getAccessToken(connectionId);

  let url: string;

  if (options.deltaLink) {
    // Use delta link for incremental sync
    url = options.deltaLink;
  } else {
    // Initial sync or full refresh
    const params = new URLSearchParams();

    if (options.startDateTime) {
      params.append('startDateTime', options.startDateTime);
    }
    if (options.endDateTime) {
      params.append('endDateTime', options.endDateTime);
    }
    if (options.maxResults) {
      params.append('$top', options.maxResults.toString());
    }

    // Select specific fields to reduce payload
    params.append(
      '$select',
      'id,subject,body,start,end,location,isAllDay,showAs,type,recurrence,attendees,changeKey,createdDateTime,lastModifiedDateTime,isCancelled,organizer'
    );

    url = `${MICROSOFT_GRAPH_BASE}/me/calendar/events/delta?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'odata.maxpagesize=50',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return getEvents(connectionId, options);
      }
    }
    throw new Error('Failed to get events');
  }

  const data = await response.json();

  return {
    value: data.value || [],
    deltaLink: data['@odata.deltaLink'],
    nextLink: data['@odata.nextLink'],
  };
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  connectionId: string,
  eventId: string
): Promise<OutlookCalendarEvent | null> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me/calendar/events/${eventId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return getEvent(connectionId, eventId);
      }
    }
    throw new Error('Failed to get event');
  }

  return response.json();
}

/**
 * Create a new event
 */
export async function createEvent(
  connectionId: string,
  event: Partial<OutlookCalendarEvent>
): Promise<OutlookCalendarEvent> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me/calendar/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return createEvent(connectionId, event);
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create event');
  }

  return response.json();
}

/**
 * Update an existing event
 */
export async function updateEvent(
  connectionId: string,
  eventId: string,
  event: Partial<OutlookCalendarEvent>
): Promise<OutlookCalendarEvent> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me/calendar/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return updateEvent(connectionId, eventId, event);
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to update event');
  }

  return response.json();
}

/**
 * Delete an event
 */
export async function deleteEvent(connectionId: string, eventId: string): Promise<void> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return deleteEvent(connectionId, eventId);
      }
    }
    throw new Error('Failed to delete event');
  }
}

// =============================================================================
// WEBHOOK SUBSCRIPTION MANAGEMENT
// =============================================================================

interface WebhookSubscription {
  id: string;
  resource: string;
  applicationId: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

/**
 * Create a webhook subscription for calendar changes
 */
export async function createWebhookSubscription(
  connectionId: string,
  notificationUrl: string,
  clientState: string
): Promise<WebhookSubscription> {
  const accessToken = await getAccessToken(connectionId);

  const expirationDateTime = new Date(
    Date.now() + WEBHOOK_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changeType: 'created,updated,deleted',
      notificationUrl,
      resource: '/me/calendar/events',
      expirationDateTime,
      clientState,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return createWebhookSubscription(connectionId, notificationUrl, clientState);
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create webhook subscription');
  }

  return response.json();
}

/**
 * Renew a webhook subscription
 */
export async function renewWebhookSubscription(
  connectionId: string,
  subscriptionId: string
): Promise<WebhookSubscription> {
  const accessToken = await getAccessToken(connectionId);

  const expirationDateTime = new Date(
    Date.now() + WEBHOOK_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expirationDateTime,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return renewWebhookSubscription(connectionId, subscriptionId);
      }
    }
    throw new Error('Failed to renew webhook subscription');
  }

  return response.json();
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhookSubscription(
  connectionId: string,
  subscriptionId: string
): Promise<void> {
  const accessToken = await getAccessToken(connectionId);

  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      const refreshResult = await refreshAccessToken(connectionId);
      if (refreshResult.success) {
        return deleteWebhookSubscription(connectionId, subscriptionId);
      }
    }
    throw new Error('Failed to delete webhook subscription');
  }
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Perform a full or incremental sync of calendar events
 */
export async function syncCalendar(
  connectionId: string,
  syncType: 'full' | 'incremental' = 'incremental'
): Promise<SyncResult> {
  const supabase = await createClient();
  const startTime = Date.now();
  let eventsProcessed = 0;
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDeleted = 0;

  try {
    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error('Connection not found');
    }

    // Get delta link for incremental sync
    let deltaLink: string | undefined;
    if (syncType === 'incremental') {
      const { data: syncState } = await supabase
        .from('calendar_sync_state')
        .select('delta_link')
        .eq('connection_id', connectionId)
        .single();

      deltaLink = syncState?.delta_link;
    }

    // Calculate date range for initial/full sync
    const now = new Date();
    const startDateTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago
    const endDateTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year ahead

    // Fetch events (paginated)
    let hasMore = true;
    let nextLink: string | undefined;
    let newDeltaLink: string | undefined;

    while (hasMore) {
      const response = await getEvents(connectionId, {
        deltaLink: nextLink || (syncType === 'incremental' ? deltaLink : undefined),
        startDateTime: !deltaLink && syncType === 'full' ? startDateTime : undefined,
        endDateTime: !deltaLink && syncType === 'full' ? endDateTime : undefined,
        maxResults: 50,
      });

      for (const event of response.value) {
        eventsProcessed++;

        // Check if event was deleted (indicated by @removed in delta response)
        const isDeleted = (event as unknown as { '@removed'?: { reason: string } })['@removed'];

        if (isDeleted) {
          // Handle deleted event
          await supabase
            .from('calendar_event_mappings')
            .delete()
            .eq('connection_id', connectionId)
            .eq('external_event_id', event.id);
          eventsDeleted++;
        } else {
          // Check if event already exists
          const { data: existingMapping } = await supabase
            .from('calendar_event_mappings')
            .select('id, rowan_event_id')
            .eq('connection_id', connectionId)
            .eq('external_event_id', event.id)
            .single();

          if (existingMapping) {
            // Update existing event
            // TODO: Implement event update logic
            eventsUpdated++;
          } else {
            // Create new event
            // TODO: Implement event creation logic
            eventsCreated++;
          }
        }
      }

      // Handle pagination
      nextLink = response.nextLink;
      newDeltaLink = response.deltaLink;
      hasMore = !!nextLink;
    }

    // Store new delta link for next incremental sync
    if (newDeltaLink) {
      await supabase.from('calendar_sync_state').upsert(
        {
          connection_id: connectionId,
          delta_link: newDeltaLink,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'connection_id',
        }
      );
    }

    // Update connection with sync results
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'active',
        last_sync_at: new Date().toISOString(),
        last_error_message: null,
      })
      .eq('id', connectionId);

    return {
      success: true,
      eventsProcessed,
      eventsCreated,
      eventsUpdated,
      eventsDeleted,
      syncDuration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[Outlook Sync] Error:', error);

    // Update connection with error
    await supabase
      .from('calendar_connections')
      .update({
        sync_status: 'error',
        last_error_message: error instanceof Error ? error.message : 'Unknown sync error',
      })
      .eq('id', connectionId);

    return {
      success: false,
      eventsProcessed,
      error: {
        code: 'SYNC_FAILED',
        message: error instanceof Error ? error.message : 'Unknown sync error',
      },
    };
  }
}

// =============================================================================
// EXPORTED SERVICE OBJECT
// =============================================================================

export const outlookCalendarService = {
  generateAuthUrl,
  exchangeCodeForTokens,
  storeTokens,
  refreshAccessToken,
  getUserProfile,
  listCalendars,
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  createWebhookSubscription,
  renewWebhookSubscription,
  deleteWebhookSubscription,
  syncCalendar,
};
