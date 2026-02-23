import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient, mockICAL } = vi.hoisted(() => {
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

  // Shared mutable state for controlling ICAL component/event mock behaviour
  const icalState = {
    nextComponent: null as Record<string, unknown> | null,
    nextEvent: null as Record<string, unknown> | null,
  };

  const defaultComponent = {
    getAllSubcomponents: vi.fn(() => [{}]),
    getFirstProperty: vi.fn(() => null),
  };

  const defaultEvent = {
    uid: 'test-uid-1',
    summary: 'Test Event',
    description: 'Test description',
    location: 'Conference Room',
    startDate: {
      isDate: false,
      toJSDate: () => new Date('2026-02-22T10:00:00Z'),
    },
    endDate: {
      toJSDate: () => new Date('2026-02-22T11:00:00Z'),
    },
  };

  const mockICAL = {
    parse: vi.fn(() => ({})),
    Component: vi.fn(function () {
      const comp = icalState.nextComponent ?? defaultComponent;
      icalState.nextComponent = null;
      return comp;
    }),
    Event: vi.fn(function () {
      const evt = icalState.nextEvent ?? defaultEvent;
      icalState.nextEvent = null;
      return evt;
    }),
    _state: icalState,
  };

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: null, error: null })),
  };
  const mockCreateClient = vi.fn(async () => mockSupabase);

  return { mockSupabase, mockCreateClient, mockICAL };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: mockCreateClient }));
vi.mock('ical.js', () => ({ default: mockICAL }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { validateICSUrl, icsImportService } from '@/lib/services/calendar/ics-import-service';

// ---------------------------------------------------------------------------
// Helper: set what the next ICAL.Component constructor call will return
// ---------------------------------------------------------------------------
function setNextComponent(comp: Record<string, unknown>) {
  mockICAL._state.nextComponent = comp;
}

function setNextEvent(evt: Record<string, unknown>) {
  mockICAL._state.nextEvent = evt;
}

// ---------------------------------------------------------------------------
// validateICSUrl
// ---------------------------------------------------------------------------
describe('validateICSUrl', () => {
  it('returns valid for a normal https URL', () => {
    const result = validateICSUrl('https://calendar.example.com/feed.ics');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toBe('https://calendar.example.com/feed.ics');
  });

  it('normalizes webcal:// to https://', () => {
    const result = validateICSUrl('webcal://calendar.example.com/feed.ics');
    expect(result.valid).toBe(true);
    expect(result.normalizedUrl).toMatch(/^https:\/\//);
  });

  it('rejects localhost addresses (SSRF protection)', () => {
    const result = validateICSUrl('https://localhost/evil.ics');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or internal/i);
  });

  it('rejects 127.0.0.1 (loopback)', () => {
    const result = validateICSUrl('https://127.0.0.1/evil.ics');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or internal/i);
  });

  it('rejects RFC1918 10.x.x.x range', () => {
    const result = validateICSUrl('https://10.0.0.1/feed.ics');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/private or internal/i);
  });

  it('rejects RFC1918 192.168.x.x range', () => {
    const result = validateICSUrl('https://192.168.1.100/feed.ics');
    expect(result.valid).toBe(false);
  });

  it('rejects AWS metadata IP (169.254.169.254)', () => {
    const result = validateICSUrl('https://169.254.169.254/latest/meta-data');
    expect(result.valid).toBe(false);
  });

  it('rejects .internal domain', () => {
    const result = validateICSUrl('https://api.corp.internal/calendar.ics');
    expect(result.valid).toBe(false);
  });

  it('rejects completely malformed URLs', () => {
    const result = validateICSUrl('not-a-url-at-all');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid URL/i);
  });

  it('strips whitespace before validation', () => {
    const result = validateICSUrl('  https://calendar.example.com/feed.ics  ');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateICSContent
// ---------------------------------------------------------------------------
describe('validateICSContent (via icsImportService.validateICSContent)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns valid with event count when content is valid ICS', () => {
    const mockComp = {
      getAllSubcomponents: vi.fn(() => [{}, {}]),
      getFirstProperty: vi.fn(() => null),
    };
    setNextComponent(mockComp);

    const result = icsImportService.validateICSContent(
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR'
    );

    expect(result.valid).toBe(true);
    expect(result.eventCount).toBe(2);
  });

  it('returns invalid when content does not have BEGIN:VCALENDAR', () => {
    const result = icsImportService.validateICSContent('random text without vcalendar');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/valid ICS/i);
  });

  it('returns invalid when ICAL.parse throws', () => {
    mockICAL.parse.mockImplementationOnce(() => { throw new Error('parse error'); });

    const result = icsImportService.validateICSContent(
      'BEGIN:VCALENDAR\nEND:VCALENDAR'
    );
    expect(result.valid).toBe(false);
  });

  it('extracts calendar name when x-wr-calname property present', () => {
    const mockCalNameProp = { getFirstValue: () => 'My Calendar' };
    const mockComp = {
      getAllSubcomponents: vi.fn(() => []),
      getFirstProperty: vi.fn((prop: string) => prop === 'x-wr-calname' ? mockCalNameProp : null),
    };
    setNextComponent(mockComp);

    const result = icsImportService.validateICSContent(
      'BEGIN:VCALENDAR\nX-WR-CALNAME:My Calendar\nEND:VCALENDAR'
    );
    expect(result.valid).toBe(true);
    expect(result.calendarName).toBe('My Calendar');
  });
});

// ---------------------------------------------------------------------------
// icsImportService.syncICSFeed
// ---------------------------------------------------------------------------
describe('icsImportService.syncICSFeed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns failure when connection not found', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null })),
    };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'calendar_connections') return selectChain;
      return insertChain;
    });

    const result = await icsImportService.syncICSFeed('conn-missing');

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('returns failure when ICS URL not configured', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'conn-1', space_id: 'space-1', provider_config: null },
        error: null,
      }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      then: vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null })),
    };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'calendar_connections') return selectChain;
      return insertChain;
    });

    const result = await icsImportService.syncICSFeed('conn-no-url');

    expect(result.success).toBe(false);
    expect(result.errors[0].error_message).toMatch(/URL not configured/i);
  });
});

// ---------------------------------------------------------------------------
// icsImportService.importICSFile
// ---------------------------------------------------------------------------
describe('icsImportService.importICSFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns error when content has no BEGIN:VCALENDAR', async () => {
    const result = await icsImportService.importICSFile(
      'not ics content',
      'space-1',
      'user-1'
    );

    expect(result.success).toBe(false);
    expect(result.eventsImported).toBe(0);
    expect(result.error).toMatch(/valid ICS/i);
  });

  it('returns error when no events found in ICS', async () => {
    const emptyComp = {
      getAllSubcomponents: vi.fn(() => []),
      getFirstProperty: vi.fn(() => null),
    };
    setNextComponent(emptyComp);

    const result = await icsImportService.importICSFile(
      'BEGIN:VCALENDAR\nEND:VCALENDAR',
      'space-1',
      'user-1'
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No events/i);
  });

  it('imports events and returns count on success', async () => {
    const mockEventInstance = {
      uid: 'uid-1',
      summary: 'My Event',
      description: '',
      location: '',
      startDate: { isDate: false, toJSDate: () => new Date('2026-02-22T10:00:00Z') },
      endDate: { toJSDate: () => new Date('2026-02-22T11:00:00Z') },
    };
    setNextEvent(mockEventInstance);

    const mockVevent = {
      getFirstProperty: vi.fn(() => null),
    };
    const compWithEvent = {
      getAllSubcomponents: vi.fn(() => [mockVevent]),
      getFirstProperty: vi.fn(() => null),
    };
    setNextComponent(compWithEvent);

    const insertChain: Record<string, unknown> = {};
    const handler = () => insertChain;
    ['select', 'eq', 'order', 'update', 'delete', 'limit', 'maybeSingle',
     'gte', 'lte', 'in', 'neq', 'is', 'not', 'single'].forEach(m => {
      insertChain[m] = vi.fn(handler);
    });
    insertChain.insert = vi.fn(handler);
    insertChain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(insertChain);

    const result = await icsImportService.importICSFile(
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR',
      'space-1',
      'user-1',
      'my-events.ics'
    );

    expect(result.success).toBe(true);
    expect(result.eventsImported).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// icsImportService aggregate
// ---------------------------------------------------------------------------
describe('icsImportService', () => {
  it('exposes all expected methods', () => {
    expect(typeof icsImportService.validateICSUrl).toBe('function');
    expect(typeof icsImportService.validateICSContent).toBe('function');
    expect(typeof icsImportService.testICSFeed).toBe('function');
    expect(typeof icsImportService.syncICSFeed).toBe('function');
    expect(typeof icsImportService.parseICSData).toBe('function');
    expect(typeof icsImportService.importICSFile).toBe('function');
  });
});
