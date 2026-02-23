import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const {
  mockSupabase,
  mockCreateClient,
  mockGoogleCalendarService,
  mockAppleCalDAVService,
  mockEventMapper,
} = vi.hoisted(() => {
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

  const mockGoogleCalendarService = {
    getEvents: vi.fn(async () => ({ items: [], nextSyncToken: 'new-sync-token' })),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };

  const mockAppleCalDAVService = {
    getEvents: vi.fn(async () => ({ events: [], nextSyncToken: undefined })),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  };

  const mockEventMapper = {
    mapGoogleToRowan: vi.fn(() => ({ title: 'Mapped Event', space_id: 'space-1' })),
    mapICalendarToRowan: vi.fn(() => ({ title: 'Apple Event', space_id: 'space-1', updated_at: new Date().toISOString() })),
    mapRowanToGoogle: vi.fn(() => ({ summary: 'Rowan Event' })),
    mapRowanToICalendar: vi.fn(() => 'BEGIN:VCALENDAR\nEND:VCALENDAR'),
    createExternalSnapshot: vi.fn(() => ({})),
  };

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
  const mockCreateClient = vi.fn(async () => mockSupabase);

  return {
    mockSupabase,
    mockCreateClient,
    mockGoogleCalendarService,
    mockAppleCalDAVService,
    mockEventMapper,
  };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('@/lib/services/calendar/google-calendar-service', () => ({
  googleCalendarService: mockGoogleCalendarService,
}));
vi.mock('@/lib/services/calendar/apple-caldav-service', () => ({
  appleCalDAVService: mockAppleCalDAVService,
}));
vi.mock('@/lib/services/calendar/event-mapper', () => ({
  eventMapper: mockEventMapper,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { performSync, calendarSyncService } from '@/lib/services/calendar/calendar-sync-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conn-1',
    user_id: 'user-1',
    space_id: 'space-1',
    provider: 'google',
    provider_account_id: 'user@gmail.com',
    provider_calendar_id: 'primary',
    access_token_vault_id: 'vault-1',
    refresh_token_vault_id: 'vault-2',
    token_expires_at: null,
    sync_direction: 'bidirectional',
    sync_status: 'active',
    sync_token: null,
    last_sync_at: null,
    next_sync_at: null,
    webhook_channel_id: null,
    webhook_resource_id: null,
    webhook_expires_at: null,
    provider_config: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setupConnectionQuery(connection: ReturnType<typeof makeConnection> | null, error: unknown = null) {
  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
     'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
     'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
      chain[m] = vi.fn(handler);
    });

    if (table === 'calendar_connections') {
      callCount++;
      if (callCount === 1) {
        // First call is getConnection
        chain.single = vi.fn(async () => ({ data: connection, error }));
      } else {
        chain.single = vi.fn(async () => ({ data: connection, error: null }));
      }
    } else if (table === 'calendar_sync_logs') {
      chain.single = vi.fn(async () => ({ data: { id: 'log-1' }, error: null }));
    } else {
      chain.single = vi.fn(async () => ({ data: null, error: null }));
    }

    chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
    return chain;
  });
}

// ---------------------------------------------------------------------------
// performSync - connection not found
// ---------------------------------------------------------------------------
describe('performSync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns failure when connection not found', async () => {
    setupConnectionQuery(null, { message: 'not found' });

    const result = await performSync('conn-missing');

    expect(result.success).toBe(false);
    expect(result.errors[0].error_code).toBe('CONNECTION_NOT_FOUND');
  });

  it('returns success for google sync with no events', async () => {
    const connection = makeConnection({ provider: 'google' });
    setupConnectionQuery(connection);

    mockGoogleCalendarService.getEvents.mockResolvedValueOnce({
      items: [],
      nextSyncToken: 'new-token',
    });

    // Mock queue as empty
    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
       'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
        chain[m] = vi.fn(handler);
      });

      if (table === 'calendar_connections') {
        chain.single = vi.fn(async () => ({ data: connection, error: null }));
      } else if (table === 'calendar_sync_logs') {
        chain.single = vi.fn(async () => ({ data: { id: 'log-1' }, error: null }));
      } else if (table === 'calendar_sync_queue') {
        // Return empty queue
        chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }));
      } else {
        chain.single = vi.fn(async () => ({ data: null, error: null }));
      }

      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
      return chain;
    });

    const result = await performSync('conn-1');

    expect(result.connection_id).toBe('conn-1');
    expect(result.events_created).toBe(0);
  });

  it('returns not-implemented error for cozi provider', async () => {
    const connection = makeConnection({ provider: 'cozi' });

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
       'or', 'filter', 'ilike', 'range', 'textSearch', 'contains'].forEach(m => {
        chain[m] = vi.fn(handler);
      });

      if (table === 'calendar_connections') {
        chain.single = vi.fn(async () => ({ data: connection, error: null }));
      } else {
        chain.single = vi.fn(async () => ({ data: { id: 'log-1' }, error: null }));
      }
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
      return chain;
    });

    const result = await performSync('conn-1');

    expect(result.success).toBe(false);
    expect(result.errors[0].error_code).toBe('NOT_IMPLEMENTED');
  });

  it('returns sync_type passed in', async () => {
    setupConnectionQuery(null, { message: 'not found' });

    const result = await performSync('conn-1', 'full');

    expect(result.sync_type).toBe('full');
  });
});

// ---------------------------------------------------------------------------
// calendarSyncService aggregate
// ---------------------------------------------------------------------------
describe('calendarSyncService', () => {
  it('exposes performSync and processOutboundQueue', () => {
    expect(typeof calendarSyncService.performSync).toBe('function');
    expect(typeof calendarSyncService.processOutboundQueue).toBe('function');
  });
});
