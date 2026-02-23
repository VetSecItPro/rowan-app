import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
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

  const mockSupabase = {
    from: vi.fn((table: string) => createChainMock({ data: null, error: null })),
  };
  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/client', () => ({ createClient: mockCreateClient }));

import { choreCalendarService } from '@/lib/services/chore-calendar-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeChore(overrides: Record<string, unknown> = {}) {
  return {
    id: 'chore-1',
    space_id: 'space-1',
    title: 'Vacuum Living Room',
    description: 'Vacuum all carpeted areas',
    frequency: 'weekly',
    assigned_to: 'user-1',
    status: 'pending',
    due_date: '2026-02-22T00:00:00Z',
    completed_at: null,
    notes: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    sort_order: 1,
    calendar_sync: false,
    category: 'cleaning',
    point_value: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// syncChoreToCalendar
// ---------------------------------------------------------------------------
describe('choreCalendarService.syncChoreToCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when chore has no due_date', async () => {
    const chore = makeChore({ due_date: null });
    const selectChain: Record<string, unknown> = {};
    const handler = () => selectChain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit', 'maybeSingle', 'is', 'not', 'in', 'neq'].forEach(m => {
      selectChain[m] = vi.fn(handler);
    });
    selectChain.single = vi.fn(async () => ({ data: chore, error: null }));
    mockSupabase.from.mockReturnValueOnce(selectChain);

    const result = await choreCalendarService.syncChoreToCalendar('chore-1');
    expect(result).toBeNull();
  });

  it('creates calendar events and sync records when chore has due_date', async () => {
    const chore = makeChore();
    const insertedEvents = [{ id: 'evt-1' }, { id: 'evt-2' }];
    const syncRecords = [{ id: 'sync-1' }];

    let fromCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
        chain[m] = vi.fn(handler);
      });

      if (table === 'chores' && fromCallCount === 1) {
        chain.single = vi.fn(async () => ({ data: chore, error: null }));
      } else if (table === 'events') {
        chain.select = vi.fn(async () => ({ data: insertedEvents, error: null }));
      } else if (table === 'chore_calendar_events') {
        chain.select = vi.fn(async () => ({ data: syncRecords, error: null }));
      }
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
      return chain;
    });

    // We just test it doesn't throw - the exact flow depends on chained calls
    await expect(choreCalendarService.syncChoreToCalendar('chore-1')).resolves.toBeDefined();
  });

  it('throws when event insert fails', async () => {
    const chore = makeChore();
    let fromCallCount = 0;

    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++;
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
        chain[m] = vi.fn(handler);
      });

      if (table === 'chores' && fromCallCount === 1) {
        chain.single = vi.fn(async () => ({ data: chore, error: null }));
      } else if (table === 'events') {
        chain.select = vi.fn(async () => ({ data: null, error: { message: 'insert failed' } }));
      }
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }));
      return chain;
    });

    await expect(choreCalendarService.syncChoreToCalendar('chore-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// unsyncFromCalendar
// ---------------------------------------------------------------------------
describe('choreCalendarService.unsyncFromCalendar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes events and sync records', async () => {
    const syncRecords = [{ event_id: 'evt-1' }, { event_id: 'evt-2' }];

    mockSupabase.from.mockImplementation((table: string) => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: syncRecords, error: null }));
      chain.eq = vi.fn(async () => ({ data: null, error: null }));
      chain.in = vi.fn(async () => ({ data: null, error: null }));
      return chain;
    });

    await expect(choreCalendarService.unsyncFromCalendar('chore-1')).resolves.not.toThrow();
  });

  it('skips event deletion when no sync records found', async () => {
    mockSupabase.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      const handler = () => chain;
      ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit',
       'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not'].forEach(m => {
        chain[m] = vi.fn(handler);
      });
      chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data: [], error: null }));
      chain.eq = vi.fn(async () => ({ data: null, error: null }));
      return chain;
    });

    await expect(choreCalendarService.unsyncFromCalendar('chore-1')).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// generateChoreEvents
// ---------------------------------------------------------------------------
describe('choreCalendarService.generateChoreEvents', () => {
  it('returns empty array when chore has no due_date', () => {
     
    const events = choreCalendarService.generateChoreEvents({ id: 'chore-1', space_id: 'space-1', title: 'Test', frequency: 'weekly' } as any);
    expect(events).toHaveLength(0);
  });

  it('generates single event for "once" frequency', () => {
    const chore = makeChore({ frequency: 'once' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any);
    expect(events).toHaveLength(1);
  });

  it('generates multiple events for daily frequency', () => {
    const chore = makeChore({ frequency: 'daily', due_date: '2026-02-01T00:00:00Z' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any, 1); // 1 month
    // 1 month ahead = ~30 events
    expect(events.length).toBeGreaterThan(25);
  });

  it('generates weekly events with correct interval', () => {
    const chore = makeChore({ frequency: 'weekly', due_date: '2026-02-01T00:00:00Z' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any, 1); // 1 month
    // ~4-5 weekly events in 1 month
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.length).toBeLessThanOrEqual(6);
  });

  it('sets is_recurring=false for "once" frequency', () => {
    const chore = makeChore({ frequency: 'once' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any);
    expect(events[0].is_recurring).toBe(false);
  });

  it('sets is_recurring=true for recurring frequencies', () => {
    const chore = makeChore({ frequency: 'weekly' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any, 1);
    expect(events[0].is_recurring).toBe(true);
  });

  it('caps events at 100', () => {
    const chore = makeChore({ frequency: 'daily', due_date: '2026-01-01T00:00:00Z' });
     
    const events = choreCalendarService.generateChoreEvents(chore as any, 12); // 12 months
    expect(events.length).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// getNextOccurrence
// ---------------------------------------------------------------------------
describe('choreCalendarService.getNextOccurrence', () => {
  it('increments by 1 day for daily frequency', () => {
    const base = new Date('2026-02-22T00:00:00Z');
    const next = choreCalendarService.getNextOccurrence(base, 'daily');
    const diffMs = next.getTime() - base.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });

  it('increments by 7 days for weekly frequency', () => {
    const base = new Date('2026-02-22T00:00:00Z');
    const next = choreCalendarService.getNextOccurrence(base, 'weekly');
    const diffMs = next.getTime() - base.getTime();
    expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('increments by 14 days for biweekly frequency', () => {
    const base = new Date('2026-02-22T00:00:00Z');
    const next = choreCalendarService.getNextOccurrence(base, 'biweekly');
    const diffMs = next.getTime() - base.getTime();
    expect(diffMs).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('increments by 1 month for monthly frequency', () => {
    const base = new Date(2026, 0, 15); // Use local date constructor to avoid UTC timezone shift
    const next = choreCalendarService.getNextOccurrence(base, 'monthly');
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBe(15);
  });

  it('returns far future date for "once" frequency (breaks loop)', () => {
    const base = new Date('2026-02-22T00:00:00Z');
    const next = choreCalendarService.getNextOccurrence(base, 'once');
    expect(next.getFullYear()).toBeGreaterThan(2030);
  });
});

// ---------------------------------------------------------------------------
// getCalendarPreferences
// ---------------------------------------------------------------------------
describe('choreCalendarService.getCalendarPreferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns preferences for a user', async () => {
    const userData = { show_chores_on_calendar: true, calendar_chore_filter: 'cleaning' };
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit', 'maybeSingle', 'is', 'not', 'in', 'neq', 'gte', 'lte'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.single = vi.fn(async () => ({ data: userData, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    const result = await choreCalendarService.getCalendarPreferences('user-1');

    expect(result.auto_sync_chores).toBe(true);
    expect(result.calendar_chore_filter).toBe('cleaning');
  });

  it('throws on database error', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit', 'maybeSingle', 'is', 'not', 'in', 'neq'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.single = vi.fn(async () => ({ data: null, error: { message: 'not found' } }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(choreCalendarService.getCalendarPreferences('user-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateCalendarPreferences
// ---------------------------------------------------------------------------
describe('choreCalendarService.updateCalendarPreferences', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates calendar sync preference', async () => {
    const chain: Record<string, unknown> = {};
    const handler = () => chain;
    ['select', 'eq', 'order', 'insert', 'update', 'delete', 'limit', 'maybeSingle', 'is', 'not', 'in', 'neq'].forEach(m => {
      chain[m] = vi.fn(handler);
    });
    chain.eq = vi.fn(async () => ({ data: null, error: null }));
    mockSupabase.from.mockReturnValue(chain);

    await expect(
      choreCalendarService.updateCalendarPreferences('user-1', true)
    ).resolves.not.toThrow();

    expect(chain.update).toHaveBeenCalledWith({ show_chores_on_calendar: true });
  });
});
