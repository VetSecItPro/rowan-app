/**
 * Tests for rewards/late-penalty-service.ts
 * Covers pure calculation functions and Supabase-backed operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculatePenalty,
  isChoreOverdue,
  getDaysOverdue,
  getSpacePenaltySettings,
  DEFAULT_PENALTY_SETTINGS,
  type LatePenaltySettings,
} from '@/lib/services/rewards/late-penalty-service';

// ---------------------------------------------------------------------------
// Mock Supabase server client
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// calculatePenalty — pure function
// ---------------------------------------------------------------------------

describe('calculatePenalty', () => {
  const settings: LatePenaltySettings = {
    ...DEFAULT_PENALTY_SETTINGS,
    enabled: true,
    default_penalty_points: 5,
    default_grace_period_hours: 2,
    max_penalty_per_chore: 50,
    progressive_penalty: true,
    penalty_multiplier_per_day: 1.5,
  };

  it('returns isLate=false when completed within grace period', () => {
    const dueDate = new Date('2026-02-22T10:00:00Z');
    const completionDate = new Date('2026-02-22T11:00:00Z'); // 1 hour later (within 2h grace)

    const result = calculatePenalty(dueDate, completionDate, settings);
    expect(result.isLate).toBe(false);
    expect(result.penaltyPoints).toBe(0);
    expect(result.daysLate).toBe(0);
  });

  it('returns isLate=true when completed after grace period', () => {
    const dueDate = new Date('2026-02-22T10:00:00Z');
    const completionDate = new Date('2026-02-22T13:00:00Z'); // 3 hours later (beyond 2h grace)

    const result = calculatePenalty(dueDate, completionDate, settings);
    expect(result.isLate).toBe(true);
    expect(result.daysLate).toBe(1); // < 24h = 1 day
    expect(result.penaltyPoints).toBe(5); // base penalty, day 1
  });

  it('applies progressive penalty correctly for multiple days late', () => {
    const dueDate = new Date('2026-02-20T10:00:00Z');
    const completionDate = new Date('2026-02-23T10:00:00Z'); // ~3 days late

    const result = calculatePenalty(dueDate, completionDate, settings);
    expect(result.isLate).toBe(true);
    expect(result.daysLate).toBe(3);
    // Progressive: ceil(5 * 1.5^(3-1)) = ceil(5 * 2.25) = ceil(11.25) = 12
    expect(result.penaltyPoints).toBe(12);
  });

  it('applies flat penalty when progressive is disabled', () => {
    const flatSettings: LatePenaltySettings = { ...settings, progressive_penalty: false };
    const dueDate = new Date('2026-02-20T10:00:00Z');
    const completionDate = new Date('2026-02-23T10:00:00Z'); // 3 days late

    const result = calculatePenalty(dueDate, completionDate, flatSettings);
    expect(result.penaltyPoints).toBe(15); // 5 * 3
  });

  it('caps penalty at max_penalty_per_chore', () => {
    const cappedSettings: LatePenaltySettings = { ...settings, max_penalty_per_chore: 10 };
    const dueDate = new Date('2026-02-10T10:00:00Z');
    const completionDate = new Date('2026-02-22T10:00:00Z'); // 12 days late

    const result = calculatePenalty(dueDate, completionDate, cappedSettings);
    expect(result.penaltyPoints).toBeLessThanOrEqual(10);
  });

  it('respects chore-specific override for grace period', () => {
    const dueDate = new Date('2026-02-22T10:00:00Z');
    const completionDate = new Date('2026-02-22T14:00:00Z'); // 4 hours late
    // Chore has 5 hour grace period — should still be on time
    const result = calculatePenalty(dueDate, completionDate, settings, { gracePeriodHours: 5 });
    expect(result.isLate).toBe(false);
  });

  it('respects chore-specific override for penalty points', () => {
    const dueDate = new Date('2026-02-22T08:00:00Z');
    const completionDate = new Date('2026-02-22T15:00:00Z'); // Late
    const result = calculatePenalty(dueDate, completionDate, settings, { penaltyPoints: 20 });
    // Day 1 progressive: ceil(20 * 1.5^0) = 20
    expect(result.penaltyPoints).toBe(20);
  });

  it('returns correct graceDeadline in result', () => {
    const dueDate = new Date('2026-02-22T10:00:00Z');
    const completionDate = new Date('2026-02-22T13:00:00Z');
    const result = calculatePenalty(dueDate, completionDate, settings);

    const expectedGraceDeadline = new Date('2026-02-22T12:00:00Z'); // +2h
    expect(result.graceDeadline.toISOString()).toBe(expectedGraceDeadline.toISOString());
  });
});

// ---------------------------------------------------------------------------
// isChoreOverdue — pure function
// ---------------------------------------------------------------------------

describe('isChoreOverdue', () => {
  it('returns false when dueDate is null', () => {
    expect(isChoreOverdue(null)).toBe(false);
    expect(isChoreOverdue(undefined)).toBe(false);
  });

  it('returns false for a future due date', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
    expect(isChoreOverdue(futureDate)).toBe(false);
  });

  it('returns true for a past due date beyond grace period', () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 60 * 1000); // 10 hours ago
    expect(isChoreOverdue(pastDate, 2)).toBe(true);
  });

  it('accepts string date input', () => {
    const pastDateStr = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    expect(isChoreOverdue(pastDateStr, 2)).toBe(true);
  });

  it('returns false when within grace period', () => {
    // Due 1 hour ago, 2 hour grace period
    const recentDue = new Date(Date.now() - 60 * 60 * 1000);
    expect(isChoreOverdue(recentDue, 2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getDaysOverdue — pure function
// ---------------------------------------------------------------------------

describe('getDaysOverdue', () => {
  it('returns 0 when dueDate is null', () => {
    expect(getDaysOverdue(null)).toBe(0);
    expect(getDaysOverdue(undefined)).toBe(0);
  });

  it('returns 0 when within grace period', () => {
    const recentDue = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    expect(getDaysOverdue(recentDue, 2)).toBe(0);
  });

  it('returns 1 when slightly past grace deadline', () => {
    // 3 hours past due date with 2h grace = 1h past grace = 1 day
    const pastDue = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const days = getDaysOverdue(pastDue, 2);
    expect(days).toBe(1);
  });

  it('returns correct days for multi-day overdue chore', () => {
    // 50 hours past due date with 2h grace = 48h past grace = exactly 2 days
    const pastDue = new Date(Date.now() - 50 * 60 * 60 * 1000);
    const days = getDaysOverdue(pastDue, 2);
    expect(days).toBe(2);
  });

  it('accepts string date input', () => {
    const pastDateStr = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const days = getDaysOverdue(pastDateStr, 2);
    expect(days).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_PENALTY_SETTINGS
// ---------------------------------------------------------------------------

describe('DEFAULT_PENALTY_SETTINGS', () => {
  it('has penalties disabled by default', () => {
    expect(DEFAULT_PENALTY_SETTINGS.enabled).toBe(false);
  });

  it('has forgiveness_allowed set to true', () => {
    expect(DEFAULT_PENALTY_SETTINGS.forgiveness_allowed).toBe(true);
  });

  it('has a reasonable max_penalty_per_chore', () => {
    expect(DEFAULT_PENALTY_SETTINGS.max_penalty_per_chore).toBeGreaterThan(0);
    expect(DEFAULT_PENALTY_SETTINGS.max_penalty_per_chore).toBeLessThanOrEqual(500);
  });
});

// ---------------------------------------------------------------------------
// getSpacePenaltySettings
// ---------------------------------------------------------------------------

describe('getSpacePenaltySettings', () => {
  it('returns merged settings when space has custom settings', async () => {
    const customSettings = { enabled: true, default_penalty_points: 10 };
    mockFrom.mockReturnValue(
      createChainMock({ data: { late_penalty_settings: customSettings }, error: null })
    );

    const result = await getSpacePenaltySettings('space-1');
    expect(result.enabled).toBe(true);
    expect(result.default_penalty_points).toBe(10);
    // Other fields should come from defaults
    expect(result.forgiveness_allowed).toBe(DEFAULT_PENALTY_SETTINGS.forgiveness_allowed);
  });

  it('returns default settings when space has no custom settings', async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: { late_penalty_settings: null }, error: null })
    );

    const result = await getSpacePenaltySettings('space-1');
    expect(result).toEqual(DEFAULT_PENALTY_SETTINGS);
  });

  it('returns default settings on DB error', async () => {
    mockFrom.mockReturnValue(
      createChainMock({ data: null, error: { message: 'fail' } })
    );

    const result = await getSpacePenaltySettings('space-1');
    expect(result).toEqual(DEFAULT_PENALTY_SETTINGS);
  });
});
