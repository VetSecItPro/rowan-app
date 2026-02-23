import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient, mockDAVClient, mockCreateDAVClient } = vi.hoisted(() => {
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

  const mockDAVClient = {
    fetchCalendars: vi.fn(),
    fetchCalendarObjects: vi.fn(),
    createCalendarObject: vi.fn(),
    updateCalendarObject: vi.fn(),
    deleteCalendarObject: vi.fn(),
  };

  const mockCreateDAVClient = vi.fn(async () => mockDAVClient);

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };

  const mockCreateClient = vi.fn(async () => mockSupabase);

  return { mockSupabase, mockCreateClient, mockDAVClient, mockCreateDAVClient };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('tsdav', () => ({ createDAVClient: mockCreateDAVClient }));
vi.mock('@/lib/services/calendar/event-mapper', () => ({
  eventMapper: {
    mapRowanToICalendar: vi.fn(() => 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:test@rowan.app\r\nDTSTART:20260101T000000Z\r\nEND:VEVENT\r\nEND:VCALENDAR'),
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  validateAppleCredentials,
  storeAppleCredentials,
  listCalendars,
  getEvents,
  getEventsDelta,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  appleCalDAVService,
} from '@/lib/services/calendar/apple-caldav-service';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeDAVCalendar(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://caldav.icloud.com/calendars/test/',
    displayName: 'Test Calendar',
    ctag: 'ctag-1',
    syncToken: 'sync-1',
    description: 'My calendar',
    timezone: 'America/New_York',
    ...overrides,
  };
}

function makeDAVObject(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://caldav.icloud.com/calendars/test/event.ics',
    etag: '"abc123"',
    data: 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:uid-1\r\nSUMMARY:Test Event\r\nDTSTART:20260101T100000Z\r\nDTEND:20260101T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR',
    ...overrides,
  };
}

// Standard credentials setup helper
function setupGetCredentials() {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { provider_account_id: 'user@icloud.com' }, error: null }),
  };
  mockSupabase.from.mockReturnValue(selectChain);
  mockSupabase.rpc.mockResolvedValue({ data: 'mock-password', error: null });
}

// ---------------------------------------------------------------------------
// validateAppleCredentials
// ---------------------------------------------------------------------------
describe('validateAppleCredentials', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns valid with calendars when credentials are correct', async () => {
    const cal = makeDAVCalendar();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([cal]);

    const result = await validateAppleCredentials('user@icloud.com', 'abc-def-ghi');

    expect(result.valid).toBe(true);
    expect(result.calendars).toHaveLength(1);
    expect(result.calendars![0].displayName).toBe('Test Calendar');
  });

  it('returns invalid when no calendars found', async () => {
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([]);

    const result = await validateAppleCredentials('user@icloud.com', 'bad-pass');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/No calendars found/);
  });

  it('returns invalid with 401 message on auth error', async () => {
    mockDAVClient.fetchCalendars.mockRejectedValueOnce(new Error('401 Unauthorized'));

    const result = await validateAppleCredentials('user@icloud.com', 'wrong-pass');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid credentials/);
  });

  it('returns invalid with 403 message on forbidden error', async () => {
    mockDAVClient.fetchCalendars.mockRejectedValueOnce(new Error('403 Forbidden'));

    const result = await validateAppleCredentials('user@icloud.com', 'expired-pass');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Access denied/);
  });

  it('returns generic error on unknown failure', async () => {
    mockDAVClient.fetchCalendars.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await validateAppleCredentials('user@icloud.com', 'pass');

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Connection failed/);
  });
});

// ---------------------------------------------------------------------------
// storeAppleCredentials
// ---------------------------------------------------------------------------
describe('storeAppleCredentials', () => {
  beforeEach(() => vi.resetAllMocks());

  it('stores password and updates connection on success', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(updateChain);

    await expect(
      storeAppleCredentials('conn-1', 'user@icloud.com', 'app-pass')
    ).resolves.not.toThrow();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('store_oauth_token', expect.objectContaining({
      p_connection_id: 'conn-1',
      p_token_type: 'app_specific_password',
    }));
  });

  it('throws when vault RPC fails', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'vault error' } });

    await expect(
      storeAppleCredentials('conn-1', 'user@icloud.com', 'pass')
    ).rejects.toThrow('Failed to store credentials securely');
  });

  it('throws when connection update fails', async () => {
    // First rpc call (store password) succeeds
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'update error' } }),
    };
    mockSupabase.from.mockReturnValue(updateChain);

    await expect(
      storeAppleCredentials('conn-1', 'user@icloud.com', 'pass')
    ).rejects.toThrow('Failed to update connection');
  });
});

// ---------------------------------------------------------------------------
// listCalendars
// ---------------------------------------------------------------------------
describe('listCalendars', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns mapped calendars from DAV client', async () => {
    setupGetCredentials();
    const cal = makeDAVCalendar();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([cal]);

    const result = await listCalendars('conn-1');

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://caldav.icloud.com/calendars/test/');
    expect(result[0].ctag).toBe('ctag-1');
  });

  it('returns empty array when no calendars', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([]);

    const result = await listCalendars('conn-1');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getEvents
// ---------------------------------------------------------------------------
describe('getEvents', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns events and sync token from primary calendar', async () => {
    setupGetCredentials();
    const cal = makeDAVCalendar();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([cal]);
    mockDAVClient.fetchCalendarObjects.mockResolvedValueOnce([makeDAVObject()]);

    const result = await getEvents('conn-1');

    expect(result.events).toHaveLength(1);
    expect(result.nextSyncToken).toBe('ctag-1');
    expect(result.events[0].etag).toBe('"abc123"');
  });

  it('returns empty events when no calendars', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([]);

    const result = await getEvents('conn-1');
    expect(result.events).toHaveLength(0);
  });

  it('uses provided calendarUrl to avoid fetching calendars list', async () => {
    setupGetCredentials();
    const cal = makeDAVCalendar();
    mockDAVClient.fetchCalendars.mockResolvedValue([cal]);
    mockDAVClient.fetchCalendarObjects.mockResolvedValueOnce([makeDAVObject()]);

    const result = await getEvents('conn-1', {
      calendarUrl: 'https://caldav.icloud.com/calendars/test/',
    });

    expect(result.events).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getEventsDelta
// ---------------------------------------------------------------------------
describe('getEventsDelta', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns empty result when ctag matches sync token', async () => {
    setupGetCredentials();
    const cal = makeDAVCalendar({ ctag: 'same-ctag' });
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([cal]);

    const result = await getEventsDelta(
      'conn-1',
      'https://caldav.icloud.com/calendars/test/',
      'same-ctag'
    );

    expect(result.events).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
    expect(result.nextSyncToken).toBe('same-ctag');
  });

  it('throws when calendar not found', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([
      makeDAVCalendar({ url: 'https://caldav.icloud.com/calendars/other/' }),
    ]);

    await expect(
      getEventsDelta('conn-1', 'https://caldav.icloud.com/calendars/test/', 'old-ctag')
    ).rejects.toThrow('Calendar not found');
  });

  it('fetches full events when ctag changed', async () => {
    setupGetCredentials();
    // For getEventsDelta -> fetchCalendars call
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([
      makeDAVCalendar({ ctag: 'new-ctag' }),
    ]);
    // For the internal getEvents call -> fetchCalendars + fetchCalendarObjects
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([makeDAVCalendar({ ctag: 'new-ctag' })]);
    mockDAVClient.fetchCalendarObjects.mockResolvedValueOnce([makeDAVObject()]);

    const result = await getEventsDelta(
      'conn-1',
      'https://caldav.icloud.com/calendars/test/',
      'old-ctag'
    );

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.nextSyncToken).toBe('new-ctag');
  });
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------
describe('createEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  const mockRowanEvent = {
    id: 'rowan-evt-1',
    title: 'Team Meeting',
    start_time: '2026-02-22T10:00:00Z',
    end_time: '2026-02-22T11:00:00Z',
    space_id: 'space-1',
    created_by: 'user-1',
    all_day: false,
    is_recurring: false,
    status: 'not-started' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('creates event in primary calendar and returns CalDAVEvent with iCal data', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([makeDAVCalendar()]);
    // Return no url so the fallback ${calendar.url}${uid}.ics is used
    mockDAVClient.createCalendarObject.mockResolvedValueOnce({});

     
    const result = await createEvent('conn-1', mockRowanEvent as any);

    expect(result.data).toBeDefined();
    expect(result.url).toBeDefined();
    expect(mockDAVClient.createCalendarObject).toHaveBeenCalled();
  });

  it('throws when no calendars found', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([]);

     
    await expect(createEvent('conn-1', mockRowanEvent as any)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------
describe('updateEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  const mockRowanEvent = {
    id: 'rowan-evt-1',
    title: 'Updated Meeting',
    start_time: '2026-02-22T10:00:00Z',
    end_time: '2026-02-22T11:00:00Z',
    space_id: 'space-1',
    created_by: 'user-1',
    all_day: false,
    is_recurring: false,
    status: 'not-started' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('updates event and returns CalDAVEvent with original url', async () => {
    setupGetCredentials();
    mockDAVClient.updateCalendarObject.mockResolvedValueOnce({});

     
    const result = await updateEvent('conn-1', 'https://caldav.icloud.com/event.ics', mockRowanEvent as any, '"old-etag"');

    expect(result.url).toBe('https://caldav.icloud.com/event.ics');
    expect(result.data).toBeDefined();
  });

  it('calls updateCalendarObject with correct arguments', async () => {
    setupGetCredentials();
    mockDAVClient.updateCalendarObject.mockResolvedValueOnce({});

     
    await updateEvent('conn-1', 'https://caldav.icloud.com/event.ics', mockRowanEvent as any);

    expect(mockDAVClient.updateCalendarObject).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarObject: expect.objectContaining({ url: 'https://caldav.icloud.com/event.ics' }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------
describe('deleteEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls deleteCalendarObject with correct url', async () => {
    setupGetCredentials();
    mockDAVClient.deleteCalendarObject.mockResolvedValueOnce({});

    await deleteEvent('conn-1', 'https://caldav.icloud.com/event.ics', '"etag"');

    expect(mockDAVClient.deleteCalendarObject).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarObject: expect.objectContaining({ url: 'https://caldav.icloud.com/event.ics' }),
      })
    );
  });

  it('does not throw when etag is omitted', async () => {
    setupGetCredentials();
    mockDAVClient.deleteCalendarObject.mockResolvedValueOnce({});

    await expect(deleteEvent('conn-1', 'https://caldav.icloud.com/event.ics')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getEvent
// ---------------------------------------------------------------------------
describe('getEvent', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns event when found in a calendar', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([makeDAVCalendar()]);
    mockDAVClient.fetchCalendarObjects.mockResolvedValueOnce([makeDAVObject()]);

    const result = await getEvent('conn-1', 'https://caldav.icloud.com/calendars/test/event.ics');

    expect(result).not.toBeNull();
    expect(result!.etag).toBe('"abc123"');
  });

  it('returns null when event not found in any calendar', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockResolvedValueOnce([makeDAVCalendar()]);
    mockDAVClient.fetchCalendarObjects.mockResolvedValueOnce([]);

    const result = await getEvent('conn-1', 'https://caldav.icloud.com/calendars/test/missing.ics');

    expect(result).toBeNull();
  });

  it('returns null when an error is thrown during lookup', async () => {
    setupGetCredentials();
    mockDAVClient.fetchCalendars.mockRejectedValueOnce(new Error('network error'));

    const result = await getEvent('conn-1', 'https://caldav.icloud.com/event.ics');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// appleCalDAVService aggregate object
// ---------------------------------------------------------------------------
describe('appleCalDAVService', () => {
  it('exposes all expected methods', () => {
    expect(typeof appleCalDAVService.validateAppleCredentials).toBe('function');
    expect(typeof appleCalDAVService.storeAppleCredentials).toBe('function');
    expect(typeof appleCalDAVService.listCalendars).toBe('function');
    expect(typeof appleCalDAVService.getEvents).toBe('function');
    expect(typeof appleCalDAVService.getEventsDelta).toBe('function');
    expect(typeof appleCalDAVService.createEvent).toBe('function');
    expect(typeof appleCalDAVService.updateEvent).toBe('function');
    expect(typeof appleCalDAVService.deleteEvent).toBe('function');
    expect(typeof appleCalDAVService.getEvent).toBe('function');
    expect(typeof appleCalDAVService.parseICalendar).toBe('function');
  });
});
