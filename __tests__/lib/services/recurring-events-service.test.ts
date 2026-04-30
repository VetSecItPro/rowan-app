import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('./calendar-service', () => ({
  calendarService: { getEventsByDateRange: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/services/calendar-service', () => ({
  calendarService: { getEventsByDateRange: vi.fn().mockResolvedValue([]) },
}));

import { recurringEventsService } from '@/lib/services/recurring-events-service';

describe('recurringEventsService.parseSimplePattern', () => {
  it('returns null for empty input', () => {
    expect(recurringEventsService.parseSimplePattern('')).toBeNull();
  });

  it('parses "daily" to { pattern: "daily", interval: 1 }', () => {
    expect(recurringEventsService.parseSimplePattern('daily')).toEqual({
      pattern: 'daily',
      interval: 1,
    });
  });

  it('parses "weekly:1,3,5" with day filter', () => {
    const result = recurringEventsService.parseSimplePattern('weekly:1,3,5');
    expect(result).toMatchObject({ pattern: 'weekly', interval: 1, days_of_week: [1, 3, 5] });
  });

  it('filters out invalid weekly day numbers', () => {
    const result = recurringEventsService.parseSimplePattern('weekly:0,7,12');
    // 7 and 12 are out of range (>=0 && <=6 only); 0 stays.
    expect(result?.days_of_week).toEqual([0]);
  });

  it('parses "monthly:15" picking first valid day', () => {
    const result = recurringEventsService.parseSimplePattern('monthly:15');
    expect(result).toMatchObject({ pattern: 'monthly', interval: 1, day_of_month: 15 });
  });

  it('returns null for unknown patterns', () => {
    expect(recurringEventsService.parseSimplePattern('quantum-tuesdays')).toBeNull();
  });
});

describe('recurringEventsService.serializeToSimplePattern', () => {
  it('serializes daily', () => {
    expect(recurringEventsService.serializeToSimplePattern({ pattern: 'daily', interval: 1 })).toBe('daily');
  });

  it('serializes weekly with sorted days', () => {
    expect(
      recurringEventsService.serializeToSimplePattern({ pattern: 'weekly', interval: 1, days_of_week: [5, 1, 3] })
    ).toBe('weekly:1,3,5');
  });

  it('serializes weekly with no days as "weekly:"', () => {
    expect(
      recurringEventsService.serializeToSimplePattern({ pattern: 'weekly', interval: 1 })
    ).toBe('weekly:');
  });

  it('serializes monthly with day_of_month', () => {
    expect(
      recurringEventsService.serializeToSimplePattern({ pattern: 'monthly', interval: 1, day_of_month: 15 })
    ).toBe('monthly:15');
  });

  it('serializes yearly as JSON (no simple format)', () => {
    const json = recurringEventsService.serializeToSimplePattern({ pattern: 'yearly', interval: 1, month: 6 });
    expect(JSON.parse(json)).toEqual({ pattern: 'yearly', interval: 1, month: 6 });
  });
});

describe('recurringEventsService.shouldGenerateOccurrence', () => {
  it('daily: matches every Nth day from origin', () => {
    const origin = new Date('2025-01-01T10:00:00Z');
    const pattern = { pattern: 'daily' as const, interval: 2 };
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-01T10:00:00Z'), pattern, origin)).toBe(true);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-02T10:00:00Z'), pattern, origin)).toBe(false);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-03T10:00:00Z'), pattern, origin)).toBe(true);
  });

  it('weekly: matches only listed days_of_week', () => {
    const origin = new Date('2025-01-06T10:00:00Z'); // Monday
    const pattern = { pattern: 'weekly' as const, interval: 1, days_of_week: [1, 3] }; // Mon, Wed
    // Monday Jan 6 -> match
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-06T10:00:00Z'), pattern, origin)).toBe(true);
    // Tuesday Jan 7 -> no
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-07T10:00:00Z'), pattern, origin)).toBe(false);
    // Wednesday Jan 8 -> match
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-08T10:00:00Z'), pattern, origin)).toBe(true);
  });

  it('monthly: matches only specified day_of_month', () => {
    const origin = new Date('2025-01-15T10:00:00Z');
    const pattern = { pattern: 'monthly' as const, interval: 1, day_of_month: 15 };
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-01-15T10:00:00Z'), pattern, origin)).toBe(true);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-02-15T10:00:00Z'), pattern, origin)).toBe(true);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-02-14T10:00:00Z'), pattern, origin)).toBe(false);
  });

  it('yearly: respects month and day_of_month constraints', () => {
    const origin = new Date('2025-06-15T10:00:00Z');
    const pattern = { pattern: 'yearly' as const, interval: 1, month: 6, day_of_month: 15 };
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2025-06-15T10:00:00Z'), pattern, origin)).toBe(true);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2026-06-15T10:00:00Z'), pattern, origin)).toBe(true);
    expect(recurringEventsService.shouldGenerateOccurrence(new Date('2026-07-15T10:00:00Z'), pattern, origin)).toBe(false);
  });

  it('returns false for unknown pattern', () => {
    const origin = new Date('2025-01-01T10:00:00Z');
    expect(
      recurringEventsService.shouldGenerateOccurrence(origin, { pattern: 'gibberish' as never, interval: 1 }, origin)
    ).toBe(false);
  });
});

describe('recurringEventsService.calculateNextDate', () => {
  it('daily advances by 1 day', () => {
    const next = recurringEventsService.calculateNextDate(new Date('2025-01-01T00:00:00Z'), {
      pattern: 'daily',
      interval: 1,
    });
    expect(next.getUTCDate()).toBe(2);
  });

  it('weekly without days_of_week jumps interval*7 days', () => {
    const next = recurringEventsService.calculateNextDate(new Date('2025-01-01T00:00:00Z'), {
      pattern: 'weekly',
      interval: 2,
    });
    // 14 days later
    expect(next.getUTCDate()).toBe(15);
  });

  it('weekly with days_of_week advances by 1 day', () => {
    const next = recurringEventsService.calculateNextDate(new Date('2025-01-01T00:00:00Z'), {
      pattern: 'weekly',
      interval: 1,
      days_of_week: [1, 3],
    });
    expect(next.getUTCDate()).toBe(2);
  });

  it('monthly advances by interval months', () => {
    const next = recurringEventsService.calculateNextDate(new Date('2025-01-15T00:00:00Z'), {
      pattern: 'monthly',
      interval: 2,
    });
    expect(next.getUTCMonth()).toBe(2); // March (0-indexed)
  });
});

describe('recurringEventsService.generateOccurrences', () => {
  const baseEvent = {
    id: 'evt-1',
    space_id: 's1',
    title: 'Standup',
    start_time: '2025-01-06T09:00:00Z', // Monday
    end_time: '2025-01-06T09:30:00Z',
    is_recurring: true,
  } as never;

  it('returns empty array for non-recurring events', () => {
    const result = recurringEventsService.generateOccurrences(
      { ...baseEvent, is_recurring: false },
      new Date('2025-01-01'),
      new Date('2025-02-01')
    );
    expect(result).toEqual([]);
  });

  it('returns empty array when recurrence_pattern missing', () => {
    const result = recurringEventsService.generateOccurrences(
      { ...baseEvent, recurrence_pattern: undefined },
      new Date('2025-01-01'),
      new Date('2025-02-01')
    );
    expect(result).toEqual([]);
  });

  it('generates daily occurrences within range', () => {
    const result = recurringEventsService.generateOccurrences(
      { ...baseEvent, recurrence_pattern: 'daily' },
      new Date('2025-01-06'),
      new Date('2025-01-09'), // 4 days
      100
    );
    expect(result.length).toBeGreaterThanOrEqual(3);
    // virtual ID format: master-N
    expect(result[0].id).toMatch(/^evt-1-\d+$/);
    expect(result[0].series_id).toBe('evt-1');
  });

  it('respects maxOccurrences cap', () => {
    const result = recurringEventsService.generateOccurrences(
      { ...baseEvent, recurrence_pattern: 'daily' },
      new Date('2025-01-06'),
      new Date('2026-01-06'),
      5
    );
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('skips dates listed in pattern.exceptions', () => {
    const pattern = JSON.stringify({
      pattern: 'daily',
      interval: 1,
      exceptions: ['2025-01-07'],
    });
    const result = recurringEventsService.generateOccurrences(
      { ...baseEvent, recurrence_pattern: pattern },
      new Date('2025-01-06'),
      new Date('2025-01-09'),
      100
    );
    const dates = result.map(r => r.occurrence_date);
    expect(dates).not.toContain('2025-01-07');
  });
});
