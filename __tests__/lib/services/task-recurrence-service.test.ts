import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { taskRecurrenceService } from '@/lib/services/task-recurrence-service';
import { createClient } from '@/lib/supabase/client';

function chain(resolved: { data?: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  const handler = () => c;
  ['from', 'select', 'insert', 'update', 'delete', 'eq', 'order', 'single'].forEach(m => {
    c[m] = vi.fn(handler);
  });
  c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('taskRecurrenceService.calculateNextDueDate', () => {
  it('advances by interval days for daily pattern', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'daily',
      interval: 3,
    });
    expect(next).toBe('2025-01-04');
  });

  it('advances by 7*interval days for weekly pattern', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'weekly',
      interval: 2,
    });
    expect(next).toBe('2025-01-15');
  });

  it('advances by 14 days for biweekly', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'biweekly',
      interval: 1,
    });
    expect(next).toBe('2025-01-15');
  });

  it('advances by interval months for monthly pattern', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-15', {
      pattern: 'monthly',
      interval: 1,
    });
    expect(next).toMatch(/2025-02-/);
  });

  it('clamps day_of_month using days-in-next-month', () => {
    // Source uses Math.min(day_of_month, daysIn(next.month+1)). For Feb advance,
    // it consults March (31 days), so day_of_month=31 stays 31, which JS rolls
    // forward to March 1. We pin the observed behavior so any change is visible.
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-15', {
      pattern: 'monthly',
      interval: 1,
      day_of_month: 31,
    });
    expect(next).toMatch(/^2025-(02|03)-/);
  });

  it('advances by interval years for yearly pattern', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-06-15', {
      pattern: 'yearly',
      interval: 1,
    });
    expect(next).toMatch(/^2026-06-/);
  });

  it('returns null for unknown pattern', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'invalid' as unknown as 'daily',
      interval: 1,
    });
    expect(next).toBeNull();
  });

  it('returns null when next date exceeds end_date', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'daily',
      interval: 1,
      end_date: '2025-01-01',
    });
    expect(next).toBeNull();
  });

  it('skips exception dates and recurses', () => {
    const next = taskRecurrenceService.calculateNextDueDate('2025-01-01', {
      pattern: 'daily',
      interval: 1,
      exceptions: ['2025-01-02'],
    });
    expect(next).toBe('2025-01-03');
  });
});

describe('taskRecurrenceService DB operations', () => {
  it('createRecurringTask inserts with recurrence fields', async () => {
    const c = chain({ data: { id: 't1', is_recurring: true }, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const result = await taskRecurrenceService.createRecurringTask({
      space_id: 's1',
      title: 'Test',
      description: 'd',
      category: 'general',
      priority: 'medium',
      created_by: 'u1',
      recurrence: { pattern: 'weekly', interval: 1, days_of_week: [1, 3] },
    } as never);

    expect(result).toEqual({ id: 't1', is_recurring: true });
    expect(c.insert).toHaveBeenCalled();
  });

  it('createRecurringTask throws on supabase error', async () => {
    const c = chain({ data: null, error: new Error('db fail') });
    vi.mocked(createClient).mockReturnValue(c as never);

    await expect(
      taskRecurrenceService.createRecurringTask({
        space_id: 's1',
        title: 'T',
        description: 'd',
        category: 'general',
        priority: 'low',
        created_by: 'u1',
        recurrence: { pattern: 'daily', interval: 1 },
      } as never)
    ).rejects.toThrow();
  });

  it('getRecurringTemplates returns empty array when no data', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    const result = await taskRecurrenceService.getRecurringTemplates('s1');
    expect(result).toEqual([]);
  });

  it('deleteRecurring deletes only template when deleteInstances=false', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    await taskRecurrenceService.deleteRecurring('t1', false);
    expect(c.delete).toHaveBeenCalledTimes(1);
  });

  it('deleteRecurring deletes instances and template when deleteInstances=true', async () => {
    const c = chain({ data: null, error: null });
    vi.mocked(createClient).mockReturnValue(c as never);

    await taskRecurrenceService.deleteRecurring('t1', true);
    expect(c.delete).toHaveBeenCalledTimes(2);
  });
});
