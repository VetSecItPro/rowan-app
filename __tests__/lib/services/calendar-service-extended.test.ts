import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
  cacheAside: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  cacheKeys: { calendarStats: (id: string) => `cal:${id}` },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300, LONG: 3600 },
}));

import { calendarService } from '@/lib/services/calendar-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown; count?: number }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'order', 'limit', 'single', 'gte', 'lte', 'lt', 'is', 'rpc', 'ilike'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('calendarService.getEvents', () => {
  it('returns events array on success', async () => {
    const c = chain({ data: [{ id: 'e1' }, { id: 'e2' }], error: null });
    const result = await calendarService.getEvents('s1', false, c as never);
    expect(result.length).toBe(2);
  });

  it('returns empty array when data is null', async () => {
    const c = chain({ data: null, error: null });
    const result = await calendarService.getEvents('s1', false, c as never);
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const c = chain({ data: null, error: new Error('rls') });
    await expect(calendarService.getEvents('s1', false, c as never)).rejects.toThrow();
  });

  it('does not filter by deleted_at when includeDeleted=true', async () => {
    const c = chain({ data: [], error: null });
    await calendarService.getEvents('s1', true, c as never);
    expect(c.is).not.toHaveBeenCalled();
  });
});

describe('calendarService.getEventById', () => {
  it('returns event on success', async () => {
    const c = chain({ data: { id: 'e1' }, error: null });
    const result = await calendarService.getEventById('e1', c as never);
    expect(result?.id).toBe('e1');
  });

  it('throws on supabase error', async () => {
    const c = chain({ data: null, error: new Error('not found') });
    await expect(calendarService.getEventById('e1', c as never)).rejects.toThrow();
  });
});

describe('calendarService.createEvent', () => {
  it('returns created event', async () => {
    const c = chain({ data: { id: 'e1', title: 'New' }, error: null });
    const result = await calendarService.createEvent({
      space_id: 's1',
      title: 'New',
      start_time: '2025-01-01T00:00:00Z',
    } as never, c as never);
    expect(result.id).toBe('e1');
  });

  it('throws on insert error', async () => {
    const c = chain({ data: null, error: new Error('constraint') });
    await expect(
      calendarService.createEvent({ space_id: 's1', title: 'X', start_time: '2025-01-01' } as never, c as never)
    ).rejects.toThrow();
  });
});

describe('calendarService.updateEvent', () => {
  it('returns updated event', async () => {
    const c = chain({ data: { id: 'e1', title: 'Updated' }, error: null });
    const result = await calendarService.updateEvent('e1', { title: 'Updated' }, c as never);
    expect(result.title).toBe('Updated');
  });

  it('throws on update error', async () => {
    const c = chain({ data: null, error: new Error('rls') });
    await expect(calendarService.updateEvent('e1', {}, c as never)).rejects.toThrow();
  });
});

describe('calendarService.deleteEvent', () => {
  it('soft-deletes by setting deleted_at when permanent=false', async () => {
    const c = chain({ data: null, error: null });
    await calendarService.deleteEvent('e1', false, c as never);
    expect(c.update).toHaveBeenCalled();
    expect(c.delete).not.toHaveBeenCalled();
  });

  it('hard-deletes when permanent=true', async () => {
    const c = chain({ data: null, error: null });
    await calendarService.deleteEvent('e1', true, c as never);
    expect(c.delete).toHaveBeenCalled();
  });

  it('throws on supabase error during soft-delete', async () => {
    const c = chain({ data: null, error: new Error('locked') });
    await expect(calendarService.deleteEvent('e1', false, c as never)).rejects.toThrow();
  });
});

describe('calendarService.updateEventStatus', () => {
  it('updates and returns event with new status', async () => {
    const c = chain({ data: { id: 'e1', status: 'completed' }, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await calendarService.updateEventStatus('e1', 'completed');
    expect(result.status).toBe('completed');
  });

  it('throws when update fails', async () => {
    const c = chain({ data: null, error: new Error('x') });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(calendarService.updateEventStatus('e1', 'in-progress')).rejects.toThrow();
  });
});

describe('calendarService.getEventStats', () => {
  it('returns counts from parallel queries', async () => {
    const fromMock = vi.fn()
      .mockReturnValueOnce(chain({ count: 10, error: null }))
      .mockReturnValueOnce(chain({ count: 2, error: null }))
      .mockReturnValueOnce(chain({ count: 5, error: null }))
      .mockReturnValueOnce(chain({ count: 8, error: null }));
    vi.mocked(createClient).mockReturnValue({ from: fromMock } as never);

    const result = await calendarService.getEventStats('s1');
    expect(result).toEqual({ total: 10, today: 2, thisWeek: 5, thisMonth: 8 });
  });

  it('uses 0 when count is null', async () => {
    const c = chain({ count: null, error: null });
    vi.mocked(createClient).mockReturnValue({ from: () => c } as never);
    const result = await calendarService.getEventStats('s1');
    expect(result.total).toBe(0);
    expect(result.today).toBe(0);
  });
});
