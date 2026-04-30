import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { yearInReviewService } from '@/lib/services/year-in-review-service';

/**
 * Build a minimal supabase double for fetchTasks/fetchGoals/fetchExpenses.
 * Each call to .from(table) returns a chain that resolves to { data, error }.
 * `tableData` keys: 'tasks' | 'goals' | 'expenses'.
 */
function fakeSupabase(tableData: Record<string, { data?: unknown; error?: unknown }>) {
  return {
    from: vi.fn((table: string) => {
      const resolved = tableData[table] ?? { data: [], error: null };
      const c: Record<string, unknown> = {};
      const handler = () => c;
      ['select', 'eq', 'gte', 'lte', 'order'].forEach(m => {
        c[m] = vi.fn(handler);
      });
      c.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolved));
      return c;
    }),
  };
}

const TARGET_YEAR = 2025;

describe('YearInReviewService.generateYearInReview', () => {
  it('aggregates a non-empty year correctly', async () => {
    const tasks = [
      { id: 't1', status: 'completed', category: 'work', created_at: '2025-01-15T00:00:00Z', completed_at: '2025-01-16T00:00:00Z' },
      { id: 't2', status: 'completed', category: 'work', created_at: '2025-02-15T00:00:00Z', completed_at: '2025-02-16T00:00:00Z' },
      { id: 't3', status: 'pending', category: 'home', created_at: '2025-03-01T00:00:00Z', completed_at: null },
    ];
    const goals = [
      { id: 'g1', status: 'completed', category: 'fitness', created_at: '2025-01-10T00:00:00Z', completed_at: '2025-06-01T00:00:00Z' },
    ];
    const expenses = [
      { id: 'e1', amount: 100, category: 'food', created_at: '2025-01-15T00:00:00Z' },
      { id: 'e2', amount: 50, category: 'food', created_at: '2025-02-15T00:00:00Z' },
    ];

    const supabase = fakeSupabase({
      tasks: { data: tasks, error: null },
      goals: { data: goals, error: null },
      expenses: { data: expenses, error: null },
    });

    const result = await yearInReviewService.generateYearInReview(
      supabase as never,
      'user-1',
      'space-1',
      TARGET_YEAR
    );

    expect(result.year).toBe(TARGET_YEAR);
    expect(result.overview.tasksCompleted).toBe(2);
    expect(result.overview.goalsAchieved).toBe(1);
    expect(result.overview.totalExpenses).toBe(150);
    expect(result.overview.goalCompletionRate).toBe(100);
    expect(result.monthlyBreakdown.length).toBe(12);
    expect(result.topCategories.length).toBeGreaterThan(0);
    expect(result.expenses.totalAmount).toBe(150);
  });

  it('handles a fully empty year (no division-by-zero, sane defaults)', async () => {
    const supabase = fakeSupabase({
      tasks: { data: [], error: null },
      goals: { data: [], error: null },
      expenses: { data: [], error: null },
    });

    const result = await yearInReviewService.generateYearInReview(
      supabase as never,
      'user-1',
      'space-1',
      TARGET_YEAR
    );

    expect(result.overview.tasksCompleted).toBe(0);
    expect(result.overview.goalsAchieved).toBe(0);
    expect(result.overview.totalExpenses).toBe(0);
    expect(result.overview.goalCompletionRate).toBe(0);
    expect(result.monthlyBreakdown.length).toBe(12);
    expect(result.expenses.totalAmount).toBe(0);
    expect(result.achievements.badgesEarned).toEqual([]);
  });

  it('awards achievement badges when thresholds are crossed', async () => {
    // 100 completed tasks -> Task Master, 10 completed goals -> Goal Crusher
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `t${i}`,
      status: 'completed',
      category: 'work',
      created_at: `2025-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      completed_at: `2025-01-${String((i % 28) + 1).padStart(2, '0')}T01:00:00Z`,
    }));
    const goals = Array.from({ length: 10 }, (_, i) => ({
      id: `g${i}`,
      status: 'completed',
      category: 'fitness',
      created_at: `2025-02-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
      completed_at: `2025-02-${String((i % 28) + 1).padStart(2, '0')}T01:00:00Z`,
    }));

    const supabase = fakeSupabase({
      tasks: { data: tasks, error: null },
      goals: { data: goals, error: null },
      expenses: { data: [], error: null },
    });

    const result = await yearInReviewService.generateYearInReview(
      supabase as never,
      'u1',
      's1',
      TARGET_YEAR
    );

    const titles = result.achievements.badgesEarned.map(b => b.title);
    expect(titles).toContain('Task Master');
    expect(titles).toContain('Goal Crusher');
  });

  it('propagates a fetch error from supabase', async () => {
    const supabase = fakeSupabase({
      tasks: { data: null, error: new Error('rls denied') },
      goals: { data: [], error: null },
      expenses: { data: [], error: null },
    });

    await expect(
      yearInReviewService.generateYearInReview(supabase as never, 'u1', 's1', TARGET_YEAR)
    ).rejects.toThrow();
  });

  it('defaults to current year when year arg is omitted', async () => {
    const supabase = fakeSupabase({
      tasks: { data: [], error: null },
      goals: { data: [], error: null },
      expenses: { data: [], error: null },
    });

    const result = await yearInReviewService.generateYearInReview(supabase as never, 'u1', 's1');
    expect(result.year).toBe(new Date().getFullYear());
  });
});
