// Google Calendar Service
// Phase 2: OAuth flow, API wrapper, and sync operations

import { google, calendar_v3 } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import type {
  CalendarConnection,
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleSyncResponse,
  SyncResult,
  TokenRefreshResult,
  WebhookRegistration,
} from '@/lib/types/calendar-integration';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// Webhook settings
const WEBHOOK_TTL_DAYS = 7;

// =============================================================================
// OAUTH CLIENT FACTORY
// =============================================================================

function createOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Google Calendar credentials not configured');
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

async function getAuthenticatedClient(connectionId: string) {
  const supabase = await createClient();

  console.log('[OAuth] Getting tokens for connection:', connectionId);

  // Get tokens from vault using RPC
  const { data: accessToken, error: accessError } = await supabase
    .rpc('get_oauth_token', {
      p_connection_id: connectionId,
      p_token_type: 'access_token',
    });

  if (accessError) {
    console.error('[OAuth] Failed to get access token:', accessError);
    throw new Error('Failed to retrieve access token');
  }

  const { data: refreshToken, error: refreshError } = await supabase
    .rpc('get_oauth_token', {
      p_connection_id: connectionId,
      p_token_type: 'refresh_token',
    });

  if (refreshError) {
    console.error('[OAuth] Failed to get refresh token:', refreshError);
    throw new Error('Failed to retrieve refresh token');
  }

  // Check if tokens were actually retrieved (never log token values, only success/failure)
  console.log('[OAuth] Token retrieval status - access:', !!accessToken, 'refresh:', !!refreshToken);

  if (!accessToken || !refreshToken) {
    console.error('[OAuth] Tokens are null despite no error. Access:', !!accessToken, 'Refresh:', !!refreshToken);
    throw new Error(`Missing OAuth tokens: access=${!!accessToken}, refresh=${!!refreshToken}`);
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await storeTokens(connectionId, tokens.access_token, tokens.refresh_token || refreshToken, tokens.expiry_date);
    }
  });

  return oauth2Client;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

async function storeTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate?: number | null
): Promise<void> {
  const supabase = await createClient();

  // Store access token
  const { error: accessError } = await supabase.rpc('store_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'access_token',
    p_token_value: accessToken,
    p_description: 'Google Calendar access token',
  });

  if (accessError) {
    console.error('Failed to store access token:', accessError);
    throw new Error('Failed to store access token');
  }

  // Store refresh token
  const { error: refreshError } = await supabase.rpc('store_oauth_token', {
    p_connection_id: connectionId,
    p_token_type: 'refresh_token',
    p_token_value: refreshToken,
    p_description: 'Google Calendar refresh token',
  });

  if (refreshError) {
    console.error('Failed to store refresh token:', refreshError);
    throw new Error('Failed to store refresh token');
  }

  // Update token expiry in connection
  if (expiryDate) {
    const expiresIn = Math.floor((expiryDate - Date.now()) / 1000);
    await supabase.rpc('update_token_expiry', {
      p_connection_id: connectionId,
      p_expires_in_seconds: expiresIn,
    });
  }
}

export async function refreshAccessToken(connectionId: string): Promise<TokenRefreshResult> {
  try {
    const oauth2Client = await getAuthenticatedClient(connectionId);
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      await storeTokens(
        connectionId,
        credentials.access_token,
        credentials.refresh_token || '',
        credentials.expiry_date
      );

      return {
        success: true,
        access_token: credentials.access_token,
        expires_in: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : undefined,
      };
    }

    return { success: false, error: 'No access token in refresh response' };
  } catch (error) {
    console.error('Token refresh failed:', error);

    // Mark connection as token expired
    const supabase = await createClient();
    await supabase.rpc('handle_token_expiry', { p_connection_id: connectionId });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

// =============================================================================
// OAUTH FLOW
// =============================================================================

export function generateAuthUrl(state: string, loginHint?: string): string {
  const oauth2Client = createOAuth2Client();

  const authUrlOptions: {
    access_type: 'offline';
    scope: string[];
    state: string;
    prompt: 'consent';
    include_granted_scopes: boolean;
    login_hint?: string;
  } = {
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh token
    include_granted_scopes: true,
  };

  // Add login_hint to pre-select the user's account in Google's OAuth flow
  if (loginHint) {
    authUrlOptions.login_hint = loginHint;
  }

  return oauth2Client.generateAuthUrl(authUrlOptions);
}

export async function exchangeCodeForTokens(
  code: string,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return { success: false, error: 'Missing tokens in response' };
    }

    await storeTokens(
      connectionId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date
    );

    // Get user's primary calendar ID and account email
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data: calendarList } = await calendar.calendarList.list();

    const primaryCalendar = calendarList.items?.find((c) => c.primary);
    const supabase = await createClient();

    await supabase
      .from('calendar_connections')
      .update({
        provider_calendar_id: primaryCalendar?.id || 'primary',
        provider_account_id: primaryCalendar?.id, // Usually the email
        sync_status: 'active',
      })
      .eq('id', connectionId);

    return { success: true };
  } catch (error) {
    console.error('Token exchange failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed',
    };
  }
}

// =============================================================================
// CALENDAR OPERATIONS
// =============================================================================

export async function listCalendars(connectionId: string): Promise<GoogleCalendarList[]> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { data } = await calendar.calendarList.list();

  return (data.items || []).map((item) => ({
    id: item.id || '',
    summary: item.summary || '',
    description: item.description ?? undefined,
    primary: item.primary ?? undefined,
    accessRole: item.accessRole as GoogleCalendarList['accessRole'],
    backgroundColor: item.backgroundColor ?? undefined,
    foregroundColor: item.foregroundColor ?? undefined,
    selected: item.selected ?? undefined,
    timeZone: item.timeZone ?? undefined,
  }));
}

export async function getEvents(
  connectionId: string,
  options: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    syncToken?: string;
    pageToken?: string;
  } = {}
): Promise<GoogleSyncResponse> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const calendarId = options.calendarId || 'primary';

  const params: calendar_v3.Params$Resource$Events$List = {
    calendarId,
    maxResults: options.maxResults || 250,
    singleEvents: true,
    orderBy: 'startTime',
  };

  // Use sync token for incremental sync, or time range for full sync
  if (options.syncToken) {
    params.syncToken = options.syncToken;
  } else {
    params.timeMin = options.timeMin || new Date().toISOString();
    params.timeMax = options.timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (options.pageToken) {
    params.pageToken = options.pageToken;
  }

  try {
    const { data } = await calendar.events.list(params);

    return {
      kind: data.kind || 'calendar#events',
      etag: data.etag || '',
      summary: data.summary || '',
      updated: data.updated || new Date().toISOString(),
      timeZone: data.timeZone || 'UTC',
      accessRole: data.accessRole || 'reader',
      nextSyncToken: data.nextSyncToken ?? undefined,
      nextPageToken: data.nextPageToken ?? undefined,
      items: (data.items || []).map(mapGoogleEvent),
    };
  } catch (error: unknown) {
    // Handle sync token invalidation (410 Gone)
    if (error && typeof error === 'object' && 'code' in error && error.code === 410) {
      console.log('Sync token invalid, performing full sync');
      // Clear sync token and retry
      const supabase = await createClient();
      await supabase
        .from('calendar_connections')
        .update({ sync_token: null })
        .eq('id', connectionId);

      // Retry without sync token
      return getEvents(connectionId, { ...options, syncToken: undefined });
    }
    throw error;
  }
}

export async function createEvent(
  connectionId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence,
      colorId: event.colorId,
      reminders: event.reminders,
    },
  });

  return mapGoogleEvent(data);
}

export async function updateEvent(
  connectionId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { data } = await calendar.events.update({
    calendarId,
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      recurrence: event.recurrence,
      colorId: event.colorId,
      reminders: event.reminders,
    },
  });

  return mapGoogleEvent(data);
}

export async function deleteEvent(
  connectionId: string,
  eventId: string,
  calendarId = 'primary'
): Promise<void> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function getEvent(
  connectionId: string,
  eventId: string,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent | null> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const { data } = await calendar.events.get({
      calendarId,
      eventId,
    });

    return mapGoogleEvent(data);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
      return null;
    }
    throw error;
  }
}

// =============================================================================
// WEBHOOK MANAGEMENT
// =============================================================================

export async function setupWebhook(
  connectionId: string,
  webhookUrl: string,
  calendarId = 'primary'
): Promise<WebhookRegistration> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const channelId = crypto.randomUUID();
  const expiration = new Date(Date.now() + WEBHOOK_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: expiration.getTime().toString(),
    },
  });

  return {
    connection_id: connectionId,
    webhook_url: webhookUrl,
    resource_id: data.resourceId || '',
    channel_id: channelId,
    expiration: expiration.toISOString(),
  };
}

export async function stopWebhook(
  connectionId: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const oauth2Client = await getAuthenticatedClient(connectionId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId,
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function mapGoogleEvent(event: calendar_v3.Schema$Event): GoogleCalendarEvent {
  return {
    id: event.id || '',
    calendarId: '', // Will be set by caller
    summary: event.summary || '(No title)',
    description: event.description || undefined,
    location: event.location || undefined,
    start: {
      dateTime: event.start?.dateTime || undefined,
      date: event.start?.date || undefined,
      timeZone: event.start?.timeZone || undefined,
    },
    end: {
      dateTime: event.end?.dateTime || undefined,
      date: event.end?.date || undefined,
      timeZone: event.end?.timeZone || undefined,
    },
    status: (event.status as 'confirmed' | 'tentative' | 'cancelled') || 'confirmed',
    recurrence: event.recurrence || undefined,
    recurringEventId: event.recurringEventId || undefined,
    originalStartTime: event.originalStartTime
      ? {
          dateTime: event.originalStartTime.dateTime || undefined,
          date: event.originalStartTime.date || undefined,
          timeZone: event.originalStartTime.timeZone || undefined,
        }
      : undefined,
    attendees: event.attendees?.map((a) => ({
      email: a.email || '',
      displayName: a.displayName || undefined,
      responseStatus: (a.responseStatus as 'needsAction' | 'declined' | 'tentative' | 'accepted') || 'needsAction',
      organizer: a.organizer || undefined,
      self: a.self || undefined,
    })),
    organizer: event.organizer
      ? {
          email: event.organizer.email || '',
          displayName: event.organizer.displayName || undefined,
          self: event.organizer.self || undefined,
        }
      : undefined,
    etag: event.etag || '',
    updated: event.updated || new Date().toISOString(),
    created: event.created || new Date().toISOString(),
    htmlLink: event.htmlLink || '',
    colorId: event.colorId || undefined,
    reminders: event.reminders
      ? {
          useDefault: event.reminders.useDefault || false,
          overrides: event.reminders.overrides?.map((r) => ({
            method: r.method || 'popup',
            minutes: r.minutes || 10,
          })),
        }
      : undefined,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const googleCalendarService = {
  // OAuth
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,

  // Calendar operations
  listCalendars,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,

  // Webhooks
  setupWebhook,
  stopWebhook,
};
