import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks (must run before any module evaluation)
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient, mockFetch } = vi.hoisted(() => {
  // Set env vars here so they're captured before the service module loads
  process.env.MICROSOFT_CLIENT_ID = 'ms-client-id';
  process.env.MICROSOFT_CLIENT_SECRET = 'ms-client-secret';
  process.env.MICROSOFT_REDIRECT_URI = 'https://app.rowan.com/ms-callback';

  function createChainMock(resolvedValue: unknown) {
    const mock: Record<string, unknown> = {};
    const handler = () => mock;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
      (mock as Record<string, unknown>)[m] = vi.fn(handler);
    });
    mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
    return mock;
  }

  const mockFetch = vi.fn();

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: 'mock-access-token', error: null })),
  };
  const mockCreateClient = vi.fn(async () => mockSupabase);

  // Inject global fetch before module load
  global.fetch = mockFetch;

  return { mockSupabase, mockCreateClient, mockFetch };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
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
  outlookCalendarService,
} from '@/lib/services/calendar/outlook-calendar-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockJsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: { get: () => null },
  });
}

function makeOutlookEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outlook-evt-1',
    subject: 'Team Meeting',
    body: { content: 'Meeting notes', contentType: 'html' },
    start: { dateTime: '2026-02-22T10:00:00', timeZone: 'UTC' },
    end: { dateTime: '2026-02-22T11:00:00', timeZone: 'UTC' },
    location: { displayName: 'Conference Room' },
    isAllDay: false,
    type: 'singleInstance',
    changeKey: 'etag-123',
    isCancelled: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateAuthUrl
// ---------------------------------------------------------------------------
describe('generateAuthUrl', () => {
  it('returns a URL with correct base authority', () => {
    const url = generateAuthUrl('csrf-state');
    expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    expect(url).toContain('state=csrf-state');
  });

  it('includes login_hint when provided', () => {
    const url = generateAuthUrl('state', 'user@outlook.com');
    expect(url).toContain('login_hint=user%40outlook.com');
  });

  it('includes client_id and redirect_uri in the URL', () => {
    const url = generateAuthUrl('state-123');
    expect(url).toContain('client_id=ms-client-id');
    expect(url).toContain('redirect_uri=');
  });
});

// ---------------------------------------------------------------------------
// exchangeCodeForTokens
// ---------------------------------------------------------------------------
describe('exchangeCodeForTokens', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns tokens on successful exchange', async () => {
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      access_token: 'at',
      refresh_token: 'rt',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'Calendars.ReadWrite',
    }));

    const result = await exchangeCodeForTokens('auth-code');
    expect(result.access_token).toBe('at');
    expect(result.refresh_token).toBe('rt');
  });

  it('throws when exchange fails', async () => {
    mockFetch.mockReturnValueOnce(mockJsonResponse(
      { error_description: 'invalid_grant' },
      400
    ));

    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// storeTokens
// ---------------------------------------------------------------------------
describe('storeTokens', () => {
  beforeEach(() => vi.resetAllMocks());

  it('stores access and refresh tokens via RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await expect(storeTokens('conn-1', 'at', 'rt', 3600)).resolves.not.toThrow();

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'store_oauth_token',
      expect.objectContaining({ p_token_type: 'access_token' })
    );
  });

  it('throws when access token RPC fails', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'vault error' } });

    await expect(storeTokens('conn-1', 'at', 'rt')).rejects.toThrow('Failed to store access token');
  });

  it('throws when refresh token RPC fails', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: null, error: null }) // access token ok
      .mockResolvedValueOnce({ data: null, error: { message: 'vault error' } }); // refresh token fail

    await expect(storeTokens('conn-1', 'at', 'rt')).rejects.toThrow('Failed to store refresh token');
  });
});

// ---------------------------------------------------------------------------
// refreshAccessToken
// ---------------------------------------------------------------------------
describe('refreshAccessToken', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns success on successful token refresh', async () => {
    // getRefreshToken rpc call
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 'old-rt', error: null })
      .mockResolvedValue({ data: null, error: null }); // storeTokens calls

    mockFetch.mockReturnValueOnce(mockJsonResponse({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'Calendars.ReadWrite',
    }));

    const result = await refreshAccessToken('conn-1');
    expect(result.success).toBe(true);
  });

  it('returns failure when refresh token not found', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const result = await refreshAccessToken('conn-1');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns failure when HTTP refresh fails', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'old-rt', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({ error_description: 'token expired' }, 400));

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(updateChain);

    const result = await refreshAccessToken('conn-1');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getUserProfile
// ---------------------------------------------------------------------------
describe('getUserProfile', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns user profile from Graph API', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      id: 'user-123',
      displayName: 'John Doe',
      mail: 'john@outlook.com',
      userPrincipalName: 'john@outlook.com',
    }));

    const profile = await getUserProfile('conn-1');
    expect(profile.displayName).toBe('John Doe');
    expect(profile.mail).toBe('john@outlook.com');
  });

  it('throws when API returns non-200 non-401', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 500));

    await expect(getUserProfile('conn-1')).rejects.toThrow('Failed to get user profile');
  });
});

// ---------------------------------------------------------------------------
// listCalendars
// ---------------------------------------------------------------------------
describe('listCalendars', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns calendars array', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      value: [
        { id: 'cal-1', name: 'Calendar', isDefaultCalendar: true },
      ],
    }));

    const result = await listCalendars('conn-1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cal-1');
  });

  it('returns empty array when value is empty', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({ value: [] }));

    const result = await listCalendars('conn-1');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------
describe('getEvents', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns events from delta endpoint', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    const event = makeOutlookEvent();
    mockFetch.mockReturnValueOnce(mockJsonResponse({
      value: [event],
      '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/delta-link',
    }));

    const result = await getEvents('conn-1');
    expect(result.value).toHaveLength(1);
    expect(result.deltaLink).toBeDefined();
  });

  it('uses provided deltaLink for incremental sync', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({ value: [] }));

    await getEvents('conn-1', {
      deltaLink: 'https://graph.microsoft.com/v1.0/me/calendar/events/delta?$deltatoken=abc',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/calendar/events/delta?$deltatoken=abc',
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// getEvent
// ---------------------------------------------------------------------------
describe('getEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns event when found', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    const event = makeOutlookEvent();
    mockFetch.mockReturnValueOnce(mockJsonResponse(event));

    const result = await getEvent('conn-1', 'outlook-evt-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('outlook-evt-1');
  });

  it('returns null when event not found (404)', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 404));

    const result = await getEvent('conn-1', 'missing-evt');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------
describe('createEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates event and returns created event data', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    const event = makeOutlookEvent();
    mockFetch.mockReturnValueOnce(mockJsonResponse(event, 201));

    const result = await createEvent('conn-1', { subject: 'New Event' });
    expect(result.id).toBe('outlook-evt-1');
  });

  it('throws when create fails', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(
      mockJsonResponse({ error: { message: 'Bad Request' } }, 400)
    );

    await expect(createEvent('conn-1', { subject: 'Bad' })).rejects.toThrow('Bad Request');
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------
describe('updateEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('updates event and returns updated data', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    const updated = makeOutlookEvent({ subject: 'Updated Meeting' });
    mockFetch.mockReturnValueOnce(mockJsonResponse(updated));

    const result = await updateEvent('conn-1', 'outlook-evt-1', { subject: 'Updated Meeting' });
    expect(result.subject).toBe('Updated Meeting');
  });

  it('sends PATCH request to correct URL', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse(makeOutlookEvent()));

    await updateEvent('conn-1', 'evt-abc', { subject: 'Test' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/calendar/events/evt-abc'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------
describe('deleteEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls DELETE on correct endpoint', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 204));

    await deleteEvent('conn-1', 'evt-to-delete');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/me/calendar/events/evt-to-delete'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('does not throw on 404 (already deleted)', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 404));

    await expect(deleteEvent('conn-1', 'missing-evt')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createWebhookSubscription
// ---------------------------------------------------------------------------
describe('createWebhookSubscription', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates webhook subscription with correct fields', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    const sub = {
      id: 'sub-1',
      resource: '/me/calendar/events',
      applicationId: 'app-1',
      changeType: 'created,updated,deleted',
      clientState: 'secret-state',
      notificationUrl: 'https://app.rowan.com/webhooks/outlook',
      expirationDateTime: new Date().toISOString(),
      creatorId: 'creator-1',
    };
    mockFetch.mockReturnValueOnce(mockJsonResponse(sub, 201));

    const result = await createWebhookSubscription(
      'conn-1',
      'https://app.rowan.com/webhooks/outlook',
      'secret-state'
    );

    expect(result.id).toBe('sub-1');
    expect(result.clientState).toBe('secret-state');
  });
});

// ---------------------------------------------------------------------------
// renewWebhookSubscription
// ---------------------------------------------------------------------------
describe('renewWebhookSubscription', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends PATCH to subscriptions endpoint', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({ id: 'sub-1', expirationDateTime: new Date().toISOString() }));

    await renewWebhookSubscription('conn-1', 'sub-1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/sub-1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteWebhookSubscription
// ---------------------------------------------------------------------------
describe('deleteWebhookSubscription', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends DELETE to subscriptions endpoint', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 204));

    await deleteWebhookSubscription('conn-1', 'sub-to-delete');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/sub-to-delete'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('does not throw on 404', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: 'access-token', error: null });
    mockFetch.mockReturnValueOnce(mockJsonResponse({}, 404));

    await expect(deleteWebhookSubscription('conn-1', 'missing-sub')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// outlookCalendarService aggregate
// ---------------------------------------------------------------------------
describe('outlookCalendarService', () => {
  it('exposes all expected methods', () => {
    const methods = [
      'generateAuthUrl', 'exchangeCodeForTokens', 'storeTokens',
      'refreshAccessToken', 'getUserProfile', 'listCalendars',
      'getEvents', 'getEvent', 'createEvent', 'updateEvent', 'deleteEvent',
      'createWebhookSubscription', 'renewWebhookSubscription',
      'deleteWebhookSubscription', 'syncCalendar',
    ];
    methods.forEach(m => {
      expect(typeof outlookCalendarService[m as keyof typeof outlookCalendarService]).toBe('function');
    });
  });
});
