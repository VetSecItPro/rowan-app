/**
 * Tests for rewards/points-service.ts
 * Covers level calculation, streak milestones, and Supabase-backed operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pointsService } from '@/lib/services/rewards/points-service';

// ---------------------------------------------------------------------------
// Chain mock helper
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range', 'gt',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// calculateLevel — pure function
// ---------------------------------------------------------------------------

describe('pointsService.calculateLevel', () => {
  it('returns level 1 for 0 points', () => {
    const level = pointsService.calculateLevel(0);
    expect(level.level).toBe(1);
  });

  it('returns higher level as points increase', () => {
    const low = pointsService.calculateLevel(0);
    const mid = pointsService.calculateLevel(500);
    const high = pointsService.calculateLevel(5000);

    expect(mid.level).toBeGreaterThanOrEqual(low.level);
    expect(high.level).toBeGreaterThanOrEqual(mid.level);
  });

  it('returns the highest level for very large point totals', () => {
    const maxLevel = pointsService.calculateLevel(999999);
    expect(maxLevel.level).toBeGreaterThan(1);
  });

  it('returns level 1 with min_points=0 for exactly 0 points', () => {
    const level1 = pointsService.calculateLevel(0);
    expect(level1.level).toBe(1);
    expect(level1.min_points).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isStreakMilestone — pure function
// ---------------------------------------------------------------------------

describe('pointsService.isStreakMilestone', () => {
  it('returns true for milestone streaks (3, 7, 14, 30)', () => {
    expect(pointsService.isStreakMilestone(3)).toBe(true);
    expect(pointsService.isStreakMilestone(7)).toBe(true);
    expect(pointsService.isStreakMilestone(14)).toBe(true);
    expect(pointsService.isStreakMilestone(30)).toBe(true);
  });

  it('returns false for non-milestone streaks', () => {
    expect(pointsService.isStreakMilestone(1)).toBe(false);
    expect(pointsService.isStreakMilestone(5)).toBe(false);
    expect(pointsService.isStreakMilestone(10)).toBe(false);
    expect(pointsService.isStreakMilestone(25)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getOrCreatePointsRecord
// ---------------------------------------------------------------------------

describe('pointsService.getOrCreatePointsRecord', () => {
  it('returns existing record when found', async () => {
    const existingRecord = {
      id: 'rp1', user_id: 'u1', space_id: 's1', points: 150,
      level: 2, current_streak: 3, longest_streak: 7,
      last_activity_at: null, created_at: '', updated_at: '',
    };
    mockFrom.mockReturnValue(createChainMock({ data: existingRecord, error: null }));

    const result = await pointsService.getOrCreatePointsRecord('u1', 's1');
    expect(result.points).toBe(150);
    expect(result.level).toBe(2);
  });

  it('creates a new record when none exists', async () => {
    const newRecord = {
      id: 'rp-new', user_id: 'u1', space_id: 's1', points: 0,
      level: 1, current_streak: 0, longest_streak: 0,
      last_activity_at: null, created_at: '', updated_at: '',
    };

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: null, error: null });
      return createChainMock({ data: newRecord, error: null });
    });

    const result = await pointsService.getOrCreatePointsRecord('u1', 's1');
    expect(result.points).toBe(0);
    expect(result.level).toBe(1);
  });

  it('throws when insert fails', async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: null, error: null });
      return createChainMock({ data: null, error: { message: 'insert failed' } });
    });

    await expect(pointsService.getOrCreatePointsRecord('u1', 's1')).rejects.toThrow('Failed to create points record');
  });
});

// ---------------------------------------------------------------------------
// getPointsBalance
// ---------------------------------------------------------------------------

describe('pointsService.getPointsBalance', () => {
  it('returns the point balance from the record', async () => {
    const record = { id: 'rp1', user_id: 'u1', space_id: 's1', points: 250, level: 3, current_streak: 0, longest_streak: 0, last_activity_at: null, created_at: '', updated_at: '' };
    mockFrom.mockReturnValue(createChainMock({ data: record, error: null }));

    const balance = await pointsService.getPointsBalance('u1', 's1');
    expect(balance).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// awardPoints
// ---------------------------------------------------------------------------

describe('pointsService.awardPoints', () => {
  it('creates a transaction and returns it', async () => {
    const existingRecord = { id: 'rp1', user_id: 'u1', space_id: 's1', points: 100, level: 1, current_streak: 0, longest_streak: 0, last_activity_at: null, created_at: '', updated_at: '' };
    const newTransaction = { id: 'tx1', user_id: 'u1', space_id: 's1', source_type: 'chore', source_id: 'c1', points: 10, reason: 'Done', metadata: {}, created_at: '' };

    // Call sequence: 1=getOrCreate, 2=insert transaction, 3=update balance
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: existingRecord, error: null });
      if (callIndex === 2) return createChainMock({ data: newTransaction, error: null });
      return createChainMock({ data: null, error: null });
    });

    const result = await pointsService.awardPoints({
      user_id: 'u1',
      space_id: 's1',
      source_type: 'chore',
      source_id: 'c1',
      points: 10,
      reason: 'Done',
    });

    expect(result.points).toBe(10);
    expect(result.source_type).toBe('chore');
  });

  it('throws when transaction insert fails', async () => {
    const existingRecord = { id: 'rp1', user_id: 'u1', space_id: 's1', points: 100, level: 1, current_streak: 0, longest_streak: 0, last_activity_at: null, created_at: '', updated_at: '' };

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: existingRecord, error: null });
      return createChainMock({ data: null, error: { message: 'tx failed' } });
    });

    await expect(
      pointsService.awardPoints({
        user_id: 'u1',
        space_id: 's1',
        source_type: 'task',
        points: 5,
        reason: 'Task done',
      })
    ).rejects.toThrow('Failed to create transaction');
  });
});

// ---------------------------------------------------------------------------
// spendPoints
// ---------------------------------------------------------------------------

describe('pointsService.spendPoints', () => {
  it('throws "Insufficient points" when user lacks the required balance', async () => {
    const record = { id: 'rp1', user_id: 'u1', space_id: 's1', points: 10, level: 1, current_streak: 0, longest_streak: 0, last_activity_at: null, created_at: '', updated_at: '' };
    mockFrom.mockReturnValue(createChainMock({ data: record, error: null }));

    await expect(
      pointsService.spendPoints('u1', 's1', 'redemption-1', 50, 'Movie night')
    ).rejects.toThrow('Insufficient points');
  });

  it('returns transaction with negative points when user has sufficient balance', async () => {
    const record = { id: 'rp1', user_id: 'u1', space_id: 's1', points: 200, level: 3, current_streak: 0, longest_streak: 0, last_activity_at: null, created_at: '', updated_at: '' };
    const transaction = { id: 'tx1', points: -50, source_type: 'redemption', user_id: 'u1', space_id: 's1', source_id: 'r1', reason: 'Redeemed: Movie night', metadata: {}, created_at: '' };

    // Call sequence: 1=spendPoints.getOrCreate, 2=awardPoints.getOrCreate, 3=insert tx, 4=update balance
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return createChainMock({ data: record, error: null });
      if (callIndex === 2) return createChainMock({ data: record, error: null });
      if (callIndex === 3) return createChainMock({ data: transaction, error: null });
      return createChainMock({ data: null, error: null });
    });

    const result = await pointsService.spendPoints('u1', 's1', 'r1', 50, 'Movie night');
    expect(result.points).toBe(-50);
  });
});

// ---------------------------------------------------------------------------
// getPointsHistory
// ---------------------------------------------------------------------------

describe('pointsService.getPointsHistory', () => {
  it('returns transaction history', async () => {
    const transactions = [
      { id: 'tx2', points: 10, created_at: '2026-02-22T12:00:00Z', source_type: 'chore' },
      { id: 'tx1', points: 5, created_at: '2026-02-21T10:00:00Z', source_type: 'task' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: transactions, error: null }));

    const history = await pointsService.getPointsHistory('u1', 's1', 20);
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('tx2');
  });

  it('returns empty array when no transactions exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const history = await pointsService.getPointsHistory('u1', 's1');
    expect(history).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(pointsService.getPointsHistory('u1', 's1')).rejects.toThrow('Failed to fetch transactions');
  });
});

// ---------------------------------------------------------------------------
// awardTaskPoints — delegates to awardPoints with task source_type
// ---------------------------------------------------------------------------

describe('pointsService.awardTaskPoints', () => {
  it('delegates to awardPoints with task source_type and correct points', async () => {
    // Spy on awardPoints to verify it's called with the right arguments
    const awardSpy = vi.spyOn(pointsService, 'awardPoints').mockResolvedValueOnce({
      id: 'tx-task',
      user_id: 'u1',
      space_id: 's1',
      source_type: 'task',
      source_id: 'task-1',
      points: 5,
      reason: 'Completed task: Buy groceries',
      metadata: {},
      created_at: '',
    });

    const result = await pointsService.awardTaskPoints('u1', 's1', 'task-1', 'Buy groceries');

    expect(awardSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        space_id: 's1',
        source_type: 'task',
        source_id: 'task-1',
      })
    );
    expect(result.source_type).toBe('task');
    expect(result.points).toBe(5);

    awardSpy.mockRestore();
  });
});
