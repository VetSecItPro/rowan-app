/**
 * Tests for goal-analytics-service.ts
 * Focuses on the pure calculation helpers (exported indirectly via getGoalAnalytics)
 * and verifies streak, category, and heatmap logic end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGoalAnalytics,
  getGoalQuickStats,
} from '@/lib/services/goal-analytics-service';

// ---------------------------------------------------------------------------
// Chain mock helper
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
// Helper to set up two sequential from() calls (goals, then checkIns)
// ---------------------------------------------------------------------------

function setupGoalsAndCheckIns(goals: unknown[], checkIns: unknown[]) {
  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) return createChainMock({ data: goals, error: null });
    return createChainMock({ data: checkIns, error: null });
  });
}

// ---------------------------------------------------------------------------
// getGoalAnalytics — completion rate
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - completionRate', () => {
  it('returns 0 completion rate when no goals exist', async () => {
    setupGoalsAndCheckIns([], []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.completionRate).toBe(0);
  });

  it('calculates 100% completion rate when all goals are completed', async () => {
    const goals = [
      { id: 'g1', status: 'completed', category: 'health', created_at: '2026-01-01', completed_at: '2026-01-30', goal_milestones: [] },
      { id: 'g2', status: 'completed', category: 'health', created_at: '2026-01-01', completed_at: '2026-02-10', goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.completionRate).toBe(100);
  });

  it('calculates partial completion rate correctly', async () => {
    const goals = [
      { id: 'g1', status: 'completed', category: 'finance', created_at: '2026-01-01', completed_at: '2026-02-01', goal_milestones: [] },
      { id: 'g2', status: 'active', category: 'finance', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
      { id: 'g3', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
      { id: 'g4', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.completionRate).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// getGoalAnalytics — avgTimeToComplete
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - avgTimeToComplete', () => {
  it('returns 0 when no goals are completed', async () => {
    const goals = [
      { id: 'g1', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.avgTimeToComplete).toBe(0);
  });

  it('calculates average days to complete across multiple goals', async () => {
    const goals = [
      // 10 days to complete
      { id: 'g1', status: 'completed', category: 'health', created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-11T00:00:00Z', goal_milestones: [] },
      // 20 days to complete
      { id: 'g2', status: 'completed', category: 'finance', created_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-21T00:00:00Z', goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.avgTimeToComplete).toBe(15); // (10 + 20) / 2
  });
});

// ---------------------------------------------------------------------------
// getGoalAnalytics — successByCategory
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - successByCategory', () => {
  it('groups goals by category with correct rates', async () => {
    const goals = [
      { id: 'g1', status: 'completed', category: 'health', created_at: '2026-01-01', completed_at: '2026-02-01', goal_milestones: [] },
      { id: 'g2', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
      { id: 'g3', status: 'completed', category: 'finance', created_at: '2026-01-01', completed_at: '2026-02-01', goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');

    expect(analytics.successByCategory['health'].total).toBe(2);
    expect(analytics.successByCategory['health'].completed).toBe(1);
    expect(analytics.successByCategory['health'].rate).toBe(50);
    expect(analytics.successByCategory['finance'].rate).toBe(100);
  });

  it('uses "Uncategorized" for goals without a category', async () => {
    const goals = [
      { id: 'g1', status: 'active', category: null, created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.successByCategory['Uncategorized']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getGoalAnalytics — streaks
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - streaks', () => {
  it('returns zero streaks when no check-ins exist', async () => {
    setupGoalsAndCheckIns([], []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.currentStreak).toBe(0);
    expect(analytics.longestStreak).toBe(0);
  });

  it('calculates longest streak from consecutive daily check-ins', async () => {
    const checkIns = [
      { created_at: '2026-01-01T10:00:00Z', check_in_date: null, progress_percentage: 20 },
      { created_at: '2026-01-02T10:00:00Z', check_in_date: null, progress_percentage: 40 },
      { created_at: '2026-01-03T10:00:00Z', check_in_date: null, progress_percentage: 60 },
      { created_at: '2026-01-05T10:00:00Z', check_in_date: null, progress_percentage: 70 }, // gap
    ];
    setupGoalsAndCheckIns([], checkIns);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.longestStreak).toBe(3);
  });

  it('deduplicates multiple check-ins on the same day', async () => {
    const checkIns = [
      { created_at: '2026-01-01T08:00:00Z', check_in_date: null, progress_percentage: 10 },
      { created_at: '2026-01-01T14:00:00Z', check_in_date: null, progress_percentage: 20 },
      { created_at: '2026-01-01T20:00:00Z', check_in_date: null, progress_percentage: 30 },
    ];
    setupGoalsAndCheckIns([], checkIns);
    const analytics = await getGoalAnalytics('space-1');
    // 3 check-ins on same day = streak of 1, not 3
    expect(analytics.longestStreak).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getGoalAnalytics — categoryBreakdown
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - categoryBreakdown', () => {
  it('returns categories sorted by count descending', async () => {
    const goals = [
      { id: 'g1', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
      { id: 'g2', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
      { id: 'g3', status: 'active', category: 'finance', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');

    expect(analytics.categoryBreakdown[0].category).toBe('health');
    expect(analytics.categoryBreakdown[0].value).toBe(2);
    expect(analytics.categoryBreakdown[1].category).toBe('finance');
  });

  it('assigns a color to each category', async () => {
    const goals = [
      { id: 'g1', status: 'active', category: 'health', created_at: '2026-01-01', completed_at: null, goal_milestones: [] },
    ];
    setupGoalsAndCheckIns(goals, []);
    const analytics = await getGoalAnalytics('space-1');
    expect(analytics.categoryBreakdown[0].color).toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// getGoalAnalytics — error propagation
// ---------------------------------------------------------------------------

describe('getGoalAnalytics - error handling', () => {
  it('throws when the goals query fails', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'DB error' } }));
    await expect(getGoalAnalytics('space-1')).rejects.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getGoalQuickStats
// ---------------------------------------------------------------------------

describe('getGoalQuickStats', () => {
  it('returns correct totals for goals and milestones', async () => {
    const goals = [
      { id: 'g1', status: 'completed', goal_milestones: [{ completed: true }, { completed: true }] },
      { id: 'g2', status: 'active', goal_milestones: [{ completed: false }, { completed: true }] },
      { id: 'g3', status: 'active', goal_milestones: [] },
    ];
    mockFrom.mockReturnValue(createChainMock({ data: goals, error: null }));

    const stats = await getGoalQuickStats('space-1');

    expect(stats.totalGoals).toBe(3);
    expect(stats.completedGoals).toBe(1);
    expect(stats.activeGoals).toBe(2);
    expect(stats.completionRate).toBeCloseTo(33.33, 1);
    expect(stats.totalMilestones).toBe(4);
    expect(stats.completedMilestones).toBe(3);
    expect(stats.thisWeekProgress).toBe(75);
  });

  it('returns zero stats when no goals exist', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));

    const stats = await getGoalQuickStats('space-1');

    expect(stats.totalGoals).toBe(0);
    expect(stats.completedGoals).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.thisWeekProgress).toBe(0);
  });

  it('throws when the goals query fails', async () => {
    mockFrom.mockReturnValue(createChainMock({ data: null, error: { message: 'fail' } }));
    await expect(getGoalQuickStats('space-1')).rejects.toBeTruthy();
  });
});
