import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks (must run before any module evaluation)
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient, mockCalendarAPI, mockOAuth2Client } = vi.hoisted(() => {
  // Set env vars here so they're captured before the service module loads
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_CALENDAR_REDIRECT_URI = 'https://app.rowan.com/callback';

  const mockCalendarAPI = {
    calendarList: { list: vi.fn() },
    events: {
      list: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      watch: vi.fn(),
    },
    channels: { stop: vi.fn() },
  };

  const mockOAuth2Client = {
    generateAuthUrl: vi.fn(() => 'https://accounts.google.com/o/oauth2/auth?mock'),
    getToken: vi.fn(),
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn(),
    on: vi.fn(),
  };

  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
  };
  const mockCreateClient = vi.fn(async () => mockSupabase);

  return { mockSupabase, mockCreateClient, mockCalendarAPI, mockOAuth2Client };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@googleapis/calendar', () => ({
  calendar: vi.fn(() => mockCalendarAPI),
  auth: {
    OAuth2: vi.fn(function () { return mockOAuth2Client; }),
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  listCalendars,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  setupWebhook,
  stopWebhook,
  googleCalendarService,
} from '@/lib/services/calendar/google-calendar-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupRpcSuccess() {
  mockSupabase.rpc.mockResolvedValue({ data: 'mock-access-token', error: null });
}

function makeGoogleEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'google-evt-1',
    summary: 'Test Event',
    description: 'A test event',
    start: { dateTime: '2026-02-22T10:00:00Z', timeZone: 'UTC' },
    end: { dateTime: '2026-02-22T11:00:00Z', timeZone: 'UTC' },
    status: 'confirmed',
    etag: '"abc"',
    updated: '2026-02-22T09:00:00Z',
    created: '2026-01-01T00:00:00Z',
    htmlLink: 'https://calendar.google.com/event?eid=1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateAuthUrl
// ---------------------------------------------------------------------------
describe('generateAuthUrl', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a URL string', () => {
    const url = generateAuthUrl('csrf-state-token');
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });

  it('calls generateAuthUrl with correct params', () => {
    generateAuthUrl('state-xyz', 'hint@gmail.com');
    expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'state-xyz',
        login_hint: 'hint@gmail.com',
        access_type: 'offline',
        prompt: 'consent',
      })
    );
  });

  it('does not include login_hint when not provided', () => {
    generateAuthUrl('state-abc');
     
    const call = (mockOAuth2Client.generateAuthUrl.mock.calls[0] as any[])[0];
    expect(call).not.toHaveProperty('login_hint');
  });
});

// ---------------------------------------------------------------------------
// exchangeCodeForTokens
// ---------------------------------------------------------------------------
describe('exchangeCodeForTokens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success when tokens retrieved', async () => {
    mockOAuth2Client.getToken.mockResolvedValueOnce({
      tokens: { access_token: 'at', refresh_token: 'rt', expiry_date: Date.now() + 3600000 },
    });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    mockCalendarAPI.calendarList.list.mockResolvedValueOnce({
      data: { items: [{ id: 'primary@gmail.com', primary: true }] },
    });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(updateChain);

    const result = await exchangeCodeForTokens('auth-code', 'conn-1');
    expect(result.success).toBe(true);
  });

  it('returns failure when missing tokens in response', async () => {
    mockOAuth2Client.getToken.mockResolvedValueOnce({
      tokens: { access_token: null, refresh_token: null },
    });

    const result = await exchangeCodeForTokens('bad-code', 'conn-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Missing tokens/);
  });

  it('returns failure when getToken throws', async () => {
    mockOAuth2Client.getToken.mockRejectedValueOnce(new Error('invalid_grant'));

    const result = await exchangeCodeForTokens('expired-code', 'conn-1');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------
describe('refreshAccessToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success and new access token on successful refresh', async () => {
    // getAuthenticatedClient needs two rpc calls (access + refresh tokens)
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'old-access-token', error: null })
      .mockResolvedValueOnce({ data: 'old-refresh-token', error: null })
      .mockResolvedValue({ data: null, error: null });

    mockOAuth2Client.refreshAccessToken.mockResolvedValueOnce({
      credentials: {
        access_token: 'new-at',
        refresh_token: 'new-rt',
        expiry_date: Date.now() + 3600000,
      },
    });

    const result = await refreshAccessToken('conn-1');
    expect(result.success).toBe(true);
    expect(result.access_token).toBe('new-at');
  });

  it('returns failure when refreshAccessToken throws', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'old-access-token', error: null })
      .mockResolvedValueOnce({ data: 'old-refresh-token', error: null })
      .mockResolvedValue({ data: null, error: null });

    mockOAuth2Client.refreshAccessToken.mockRejectedValueOnce(new Error('token expired'));

    const result = await refreshAccessToken('conn-1');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// listCalendars
// ---------------------------------------------------------------------------
describe('listCalendars', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped calendar list', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.calendarList.list.mockResolvedValueOnce({
      data: {
        items: [
          { id: 'cal-1', summary: 'My Calendar', primary: true, accessRole: 'owner' },
        ],
      },
    });

    const result = await listCalendars('conn-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cal-1');
    expect(result[0].primary).toBe(true);
  });

  it('returns empty array when no calendars', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.calendarList.list.mockResolvedValueOnce({ data: { items: [] } });

    const result = await listCalendars('conn-1');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------
describe('getEvents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped events from list response', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    const googleEvent = makeGoogleEvent();
    mockCalendarAPI.events.list.mockResolvedValueOnce({
      data: {
        kind: 'calendar#events',
        items: [googleEvent],
        nextSyncToken: 'sync-token-1',
      },
    });

    const result = await getEvents('conn-1');
    expect(result.items).toHaveLength(1);
    expect(result.nextSyncToken).toBe('sync-token-1');
    expect(result.items[0].id).toBe('google-evt-1');
  });

  it('retries without sync token on 410 error', async () => {
    // First getAuthenticatedClient call
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });

    // First call throws 410
    const goneError = Object.assign(new Error('Gone'), { code: 410 });
    mockCalendarAPI.events.list.mockRejectedValueOnce(goneError);

    // Supabase update for clearing sync token
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(updateChain);

    // Second getAuthenticatedClient call (retry)
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });

    // Second events.list call succeeds
    mockCalendarAPI.events.list.mockResolvedValueOnce({
      data: { items: [makeGoogleEvent()], nextSyncToken: 'new-token' },
    });

    const result = await getEvents('conn-1', { syncToken: 'invalid-token' });
    expect(result.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------
describe('createEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates event and returns mapped GoogleCalendarEvent', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.insert.mockResolvedValueOnce({ data: makeGoogleEvent() });

    const result = await createEvent('conn-1', {
      summary: 'New Event',
      start: { dateTime: '2026-02-22T10:00:00Z' },
      end: { dateTime: '2026-02-22T11:00:00Z' },
    });

    expect(result.id).toBe('google-evt-1');
    expect(result.summary).toBe('Test Event');
  });

  it('calls insert with correct calendarId', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.insert.mockResolvedValueOnce({ data: makeGoogleEvent() });

    await createEvent('conn-1', { summary: 'Test' }, 'work@gmail.com');

    expect(mockCalendarAPI.events.insert).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: 'work@gmail.com' })
    );
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------
describe('updateEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates event and returns mapped event', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.update.mockResolvedValueOnce({
      data: makeGoogleEvent({ summary: 'Updated Event' }),
    });

    const result = await updateEvent('conn-1', 'google-evt-1', { summary: 'Updated Event' });
    expect(result.summary).toBe('Updated Event');
  });

  it('calls update with correct eventId', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.update.mockResolvedValueOnce({ data: makeGoogleEvent() });

    await updateEvent('conn-1', 'evt-123', { summary: 'Test' });

    expect(mockCalendarAPI.events.update).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-123' })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------
describe('deleteEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls delete with correct parameters', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.delete.mockResolvedValueOnce({});

    await deleteEvent('conn-1', 'evt-to-delete');

    expect(mockCalendarAPI.events.delete).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-to-delete', calendarId: 'primary' })
    );
  });

  it('resolves without error on success', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.delete.mockResolvedValueOnce({});

    await expect(deleteEvent('conn-1', 'evt-1')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getEvent
// ---------------------------------------------------------------------------
describe('getEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns event when found', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.get.mockResolvedValueOnce({ data: makeGoogleEvent() });

    const result = await getEvent('conn-1', 'google-evt-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('google-evt-1');
  });

  it('returns null when event not found (404)', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    const notFoundError = Object.assign(new Error('Not Found'), { code: 404 });
    mockCalendarAPI.events.get.mockRejectedValueOnce(notFoundError);

    const result = await getEvent('conn-1', 'missing-evt');
    expect(result).toBeNull();
  });

  it('throws on non-404 errors', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.get.mockRejectedValueOnce(new Error('server error'));

    await expect(getEvent('conn-1', 'evt-1')).rejects.toThrow('server error');
  });
});

// ---------------------------------------------------------------------------
// setupWebhook
// ---------------------------------------------------------------------------
describe('setupWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers webhook and returns WebhookRegistration', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.watch.mockResolvedValueOnce({
      data: { resourceId: 'resource-123', id: 'channel-abc' },
    });

    const result = await setupWebhook('conn-1', 'https://app.rowan.com/webhook');

    expect(result.connection_id).toBe('conn-1');
    expect(result.resource_id).toBe('resource-123');
    expect(result.webhook_url).toBe('https://app.rowan.com/webhook');
  });

  it('sends correct watch request for a specific calendar', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.events.watch.mockResolvedValueOnce({
      data: { resourceId: 'r1', id: 'c1' },
    });

    await setupWebhook('conn-1', 'https://app.rowan.com/webhook', 'work@gmail.com');

    expect(mockCalendarAPI.events.watch).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: 'work@gmail.com' })
    );
  });
});

// ---------------------------------------------------------------------------
// stopWebhook
// ---------------------------------------------------------------------------
describe('stopWebhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls channels.stop with correct channel and resource', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'access-token', error: null })
      .mockResolvedValueOnce({ data: 'refresh-token', error: null });
    mockCalendarAPI.channels.stop.mockResolvedValueOnce({});

    await stopWebhook('conn-1', 'ch-123', 'res-456');

    expect(mockCalendarAPI.channels.stop).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { id: 'ch-123', resourceId: 'res-456' },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// googleCalendarService aggregate object
// ---------------------------------------------------------------------------
describe('googleCalendarService', () => {
  it('exposes all expected methods', () => {
    const expectedMethods = [
      'generateAuthUrl', 'exchangeCodeForTokens', 'refreshAccessToken',
      'listCalendars', 'getEvents', 'createEvent', 'updateEvent',
      'deleteEvent', 'getEvent', 'setupWebhook', 'stopWebhook',
    ];
    expectedMethods.forEach(m => {
      expect(typeof googleCalendarService[m as keyof typeof googleCalendarService]).toBe('function');
    });
  });
});
