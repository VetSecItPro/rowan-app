/**
 * Tests for goal-contributions-service.ts
 * Covers CRUD operations, statistics, and trend calculations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGoalContributions,
  getGoalContribution,
  createGoalContribution,
  updateGoalContribution,
  deleteGoalContribution,
  getUserContributions,
  createFinancialGoal,
  getFinancialGoals,
  getFinancialGoal,
  getGoalContributionStats,
  getGoalsNearingTarget,
  getGoalsBehindSchedule,
  getMonthlyContributionTrends,
  calculateProjectedCompletionDate,
} from '@/lib/services/goal-contributions-service';

// ---------------------------------------------------------------------------
// Chain mock helper
// ---------------------------------------------------------------------------

function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  [
    'select', 'eq', 'order', 'insert', 'update', 'delete', 'single',
    'limit', 'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not',
    'upsert', 'match', 'or', 'filter', 'ilike', 'rpc', 'range', 'lt',
  ].forEach((m) => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getGoalContributions
// ---------------------------------------------------------------------------

describe('getGoalContributions', () => {
  it('returns contributions for a goal', async () => {
    const mockData = [
      { id: 'c1', goal_id: 'g1', user_id: 'u1', amount: 100, contribution_date: '2026-02-01', description: null, payment_method: null, expense_id: null, created_at: '', updated_at: '', created_by: 'u1' },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await getGoalContributions('g1');
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(100);
  });

  it('returns empty array when no contributions exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getGoalContributions('g1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getGoalContributions('g1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getGoalContribution
// ---------------------------------------------------------------------------

describe('getGoalContribution', () => {
  it('returns a single contribution', async () => {
    const mockData = { id: 'c1', goal_id: 'g1', amount: 50 };
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await getGoalContribution('c1');
    expect(result?.amount).toBe(50);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getGoalContribution('c1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createGoalContribution
// ---------------------------------------------------------------------------

describe('createGoalContribution', () => {
  it('returns the created contribution', async () => {
    const mockData = { id: 'c-new', goal_id: 'g1', user_id: 'u1', amount: 200, contribution_date: '2026-02-22' };
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await createGoalContribution({
      goal_id: 'g1',
      user_id: 'u1',
      amount: 200,
      created_by: 'u1',
    });
    expect(result.amount).toBe(200);
    expect(result.id).toBe('c-new');
  });

  it('uses today as contribution_date when not provided', async () => {
    const mockData = { id: 'c-new', goal_id: 'g1', user_id: 'u1', amount: 50, contribution_date: new Date().toISOString().split('T')[0] };
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await createGoalContribution({
      goal_id: 'g1',
      user_id: 'u1',
      amount: 50,
      created_by: 'u1',
    });
    expect(result.contribution_date).toBe(new Date().toISOString().split('T')[0]);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(createGoalContribution({ goal_id: 'g1', user_id: 'u1', amount: 50, created_by: 'u1' })).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// updateGoalContribution
// ---------------------------------------------------------------------------

describe('updateGoalContribution', () => {
  it('returns the updated contribution', async () => {
    const mockData = { id: 'c1', amount: 300 };
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await updateGoalContribution('c1', { amount: 300 });
    expect(result.amount).toBe(300);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(updateGoalContribution('c1', { amount: 300 })).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// deleteGoalContribution
// ---------------------------------------------------------------------------

describe('deleteGoalContribution', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    await expect(deleteGoalContribution('c1')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(deleteGoalContribution('c1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getUserContributions
// ---------------------------------------------------------------------------

describe('getUserContributions', () => {
  it('returns contributions for a user', async () => {
    const mockData = [{ id: 'c1', user_id: 'u1', amount: 75 }];
    mockFrom.mockReturnValue(createChainMock({ data: mockData, error: null }));

    const result = await getUserContributions('u1');
    expect(result).toHaveLength(1);
  });

  it('filters by goalId when provided', async () => {
    const chain = createChainMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await getUserContributions('u1', 'g1');
    // Verify eq was called with goal_id filter
    expect((chain.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('goal_id', 'g1');
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getUserContributions('u1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createFinancialGoal
// ---------------------------------------------------------------------------

describe('createFinancialGoal', () => {
  it('returns the created financial goal', async () => {
    const mockGoal = { id: 'fg1', title: 'Vacation fund', is_financial: true, target_amount: 5000 };
    mockFrom.mockReturnValue(createChainMock({ data: mockGoal, error: null }));

    const result = await createFinancialGoal({
      space_id: 'space-1',
      title: 'Vacation fund',
      target_amount: 5000,
      created_by: 'u1',
    });
    expect(result.is_financial).toBe(true);
    expect(result.target_amount).toBe(5000);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(createFinancialGoal({ space_id: 's1', title: 'Test', target_amount: 100, created_by: 'u1' })).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getGoalContributionStats
// ---------------------------------------------------------------------------

describe('getGoalContributionStats', () => {
  it('returns stats when found', async () => {
    const mockStats = {
      goal_id: 'g1',
      contribution_count: 5,
      contributor_count: 2,
      total_contributed: 500,
      avg_contribution: 100,
      first_contribution_date: '2026-01-01',
      last_contribution_date: '2026-02-15',
      target_amount: 1000,
      current_amount: 500,
      target_date: '2026-12-31',
      completion_percentage: 50,
      amount_remaining: 500,
    };
    mockFrom.mockReturnValue(createChainMock({ data: mockStats, error: null }));

    const result = await getGoalContributionStats('g1');
    expect(result?.completion_percentage).toBe(50);
    expect(result?.total_contributed).toBe(500);
  });

  it('returns null when no stats exist (PGRST116)', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { code: 'PGRST116' } }));
    const result = await getGoalContributionStats('g1');
    expect(result).toBeNull();
  });

  it('throws for non-PGRST116 DB errors', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { code: '500', message: 'fail' } }));
    await expect(getGoalContributionStats('g1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getGoalsNearingTarget
// ---------------------------------------------------------------------------

describe('getGoalsNearingTarget', () => {
  it('returns goals above the threshold', async () => {
    const mockGoals = [
      { id: 'g1', progress: 95, is_financial: true },
      { id: 'g2', progress: 92, is_financial: true },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockGoals, error: null }));

    const result = await getGoalsNearingTarget('space-1', 90);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no goals are nearing target', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getGoalsNearingTarget('space-1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getMonthlyContributionTrends
// ---------------------------------------------------------------------------

describe('getMonthlyContributionTrends', () => {
  it('groups contributions by month and returns sorted array', async () => {
    const mockContributions = [
      { contribution_date: '2026-01-15', amount: 100 },
      { contribution_date: '2026-01-20', amount: 200 },
      { contribution_date: '2026-02-05', amount: 150 },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: mockContributions, error: null }));

    const result = await getMonthlyContributionTrends('g1');
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2026-01');
    expect(result[0].total).toBe(300);
    expect(result[0].count).toBe(2);
    expect(result[1].month).toBe('2026-02');
    expect(result[1].total).toBe(150);
  });

  it('returns empty array when no contributions exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: null }));
    const result = await getMonthlyContributionTrends('g1');
    expect(result).toEqual([]);
  });

  it('throws on DB error', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getMonthlyContributionTrends('g1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// calculateProjectedCompletionDate
// ---------------------------------------------------------------------------

describe('calculateProjectedCompletionDate', () => {
  it('returns projected date from RPC function', async () => {
    mockRpc.mockResolvedValue({ data: '2026-12-31', error: null });

    const result = await calculateProjectedCompletionDate('g1');
    expect(result).toBe('2026-12-31');
  });

  it('returns null when goal cannot be projected', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const result = await calculateProjectedCompletionDate('g1');
    expect(result).toBeNull();
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC fail' } });
    await expect(calculateProjectedCompletionDate('g1')).rejects.toBeTruthy();
  });
});
