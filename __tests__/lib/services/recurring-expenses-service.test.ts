import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import {
  analyzeRecurringPatterns,
  getRecurringPatterns,
  detectDuplicateSubscriptions,
  confirmPattern,
  ignorePattern,
  mergePatterns,
  getUpcomingRecurring,
  createExpenseFromPattern,
} from '@/lib/services/recurring-expenses-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'order', 'limit', 'single', 'gte', 'lte', 'rpc'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyzeRecurringPatterns', () => {
  it('returns empty array when fewer than 3 expenses found', async () => {
    const c = chain({ data: [{ id: 'e1' }, { id: 'e2' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await analyzeRecurringPatterns('s1');
    expect(result).toEqual([]);
  });

  it('returns empty array when supabase returns null data', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await analyzeRecurringPatterns('s1')).toEqual([]);
  });

  it('throws when supabase errors', async () => {
    const c = chain({ data: null, error: new Error('rls') });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(analyzeRecurringPatterns('s1')).rejects.toThrow();
  });
});

describe('getRecurringPatterns', () => {
  it('returns supabase data', async () => {
    const c = chain({ data: [{ id: 'p1', category: 'Subscriptions' }], error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await getRecurringPatterns('s1');
    expect(result.length).toBe(1);
  });

  it('returns empty array when supabase returns null', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await getRecurringPatterns('s1')).toEqual([]);
  });

  it('throws on error', async () => {
    const c = chain({ data: null, error: new Error('x') });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(getRecurringPatterns('s1')).rejects.toThrow();
  });
});

describe('detectDuplicateSubscriptions', () => {
  it('flags multiple Subscriptions-category patterns as duplicates', async () => {
    const c = chain({
      data: [
        { id: 'p1', category: 'Subscriptions' },
        { id: 'p2', category: 'Subscriptions' },
        { id: 'p3', category: 'Groceries' },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(c as never);
    const result = await detectDuplicateSubscriptions('s1');
    expect(result.length).toBe(2);
    expect(result.every(r => r.category === 'Subscriptions')).toBe(true);
  });

  it('does not flag single subscription', async () => {
    const c = chain({
      data: [{ id: 'p1', category: 'Subscriptions' }],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await detectDuplicateSubscriptions('s1')).toEqual([]);
  });

  it('does not flag duplicates in non-target categories', async () => {
    const c = chain({
      data: [
        { id: 'p1', category: 'Groceries' },
        { id: 'p2', category: 'Groceries' },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(c as never);
    expect(await detectDuplicateSubscriptions('s1')).toEqual([]);
  });
});

describe('confirmPattern + ignorePattern', () => {
  it('confirmPattern issues an update', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    await confirmPattern('p1');
    expect(c.update).toHaveBeenCalled();
  });

  it('ignorePattern issues an update', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    await ignorePattern('p1');
    expect(c.update).toHaveBeenCalled();
  });
});

describe('mergePatterns', () => {
  it('returns early when loserIds is empty', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);
    await mergePatterns('s1', 'w1', []);
    expect(c.from).not.toHaveBeenCalled();
  });

  it('throws when winner is in loserIds', async () => {
    await expect(mergePatterns('s1', 'w1', ['w1', 'l1'])).rejects.toThrow(/Winner cannot also be a loser/);
  });

  it('throws when row count mismatch (missing pattern)', async () => {
    const c = chain({
      data: [
        { id: 'w1', space_id: 's1', expense_ids: [], occurrence_count: 1, first_occurrence: '2025-01-01', last_occurrence: '2025-01-15' },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(mergePatterns('s1', 'w1', ['l1', 'l2'])).rejects.toThrow(/not found/);
  });

  it('throws when a row has different space_id (cross-space attack)', async () => {
    const c = chain({
      data: [
        { id: 'w1', space_id: 's1', expense_ids: [], occurrence_count: 1, first_occurrence: '2025-01-01', last_occurrence: '2025-01-15' },
        { id: 'l1', space_id: 's2', expense_ids: [], occurrence_count: 1, first_occurrence: '2025-01-01', last_occurrence: '2025-01-15' },
      ],
      error: null,
    });
    vi.mocked(createClient).mockReturnValue(c as never);
    await expect(mergePatterns('s1', 'w1', ['l1'])).rejects.toThrow(/Cross-space/);
  });
});

describe('createExpenseFromPattern', () => {
  it('returns success: false when pattern not found', async () => {
    // First call (pattern lookup) returns null
    const fromMock = vi.fn();
    const supa = { from: fromMock } as never;
    fromMock.mockReturnValueOnce(chain({ data: null, error: { message: 'not found' } }));
    vi.mocked(createClient).mockReturnValue(supa);

    const result = await createExpenseFromPattern('p1', 'u1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Pattern not found');
  });
});
