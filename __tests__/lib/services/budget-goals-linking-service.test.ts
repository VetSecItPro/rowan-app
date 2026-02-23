import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBudgetGoalLink,
  getBudgetGoalLinks,
  getBudgetGoalLinksForGoal,
  updateBudgetGoalLinkProgress,
  deleteBudgetGoalLink,
  BUDGET_GOAL_TEMPLATES,
} from '@/lib/services/budget-goals-linking-service';

// ── Supabase client mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockClient = { from: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/services/goals-service', () => ({
  createGoal: vi.fn().mockResolvedValue({ id: 'goal-new', title: 'Test' }),
  updateGoal: vi.fn().mockResolvedValue({}),
  createMilestone: vi.fn().mockResolvedValue({ id: 'ms-1' }),
}));
vi.mock('@/lib/services/categories-tags-service', () => ({
  getExpenseStatsByCategory: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/constants/default-categories', () => ({
  getDefaultCategoriesForDomain: vi.fn().mockReturnValue([
    { name: 'Food', monthly_budget: 500 },
  ]),
}));

const MOCK_LINK = {
  id: 'link-1',
  space_id: 'space-1',
  goal_id: 'goal-1',
  budget_category: 'Food',
  link_type: 'budget_limit' as const,
  target_amount: 500,
  current_amount: 200,
  target_percentage: 100,
  current_percentage: 40,
  time_period: 'monthly' as const,
  auto_update: true,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('budget-goals-linking-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── BUDGET_GOAL_TEMPLATES ─────────────────────────────────────────────────
  describe('BUDGET_GOAL_TEMPLATES', () => {
    it('has expected template keys', () => {
      expect(BUDGET_GOAL_TEMPLATES).toHaveProperty('emergency_fund');
      expect(BUDGET_GOAL_TEMPLATES).toHaveProperty('vacation_savings');
      expect(BUDGET_GOAL_TEMPLATES).toHaveProperty('monthly_budget_limit');
    });

    it('emergency_fund template has milestones', () => {
      expect(BUDGET_GOAL_TEMPLATES.emergency_fund.milestones.length).toBeGreaterThan(0);
    });
  });

  // ── createBudgetGoalLink ──────────────────────────────────────────────────
  describe('createBudgetGoalLink', () => {
    it('returns created link on success', async () => {
      const chain = createChainMock({ data: MOCK_LINK, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createBudgetGoalLink({
        space_id: 'space-1',
        goal_id: 'goal-1',
        budget_category: 'Food',
        link_type: 'budget_limit',
        created_by: 'user-1',
      });

      expect(result).toEqual(MOCK_LINK);
    });

    it('throws when insert fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Insert failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        createBudgetGoalLink({
          space_id: 'space-1',
          goal_id: 'goal-1',
          budget_category: 'Food',
          link_type: 'budget_limit',
          created_by: 'user-1',
        })
      ).rejects.toBeTruthy();
    });
  });

  // ── getBudgetGoalLinks ────────────────────────────────────────────────────
  describe('getBudgetGoalLinks', () => {
    it('returns array of links for a space', async () => {
      const chain = createChainMock({ data: [MOCK_LINK], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetGoalLinks('space-1');

      expect(result).toHaveLength(1);
    });

    it('returns empty array when none exist', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetGoalLinks('space-1');

      expect(result).toEqual([]);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBudgetGoalLinks('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getBudgetGoalLinksForGoal ──────────────────────────────────────────────
  describe('getBudgetGoalLinksForGoal', () => {
    it('returns links filtered by goal id', async () => {
      const chain = createChainMock({ data: [MOCK_LINK], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetGoalLinksForGoal('goal-1');

      expect(result).toHaveLength(1);
      expect(result[0].goal_id).toBe('goal-1');
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBudgetGoalLinksForGoal('goal-1')).rejects.toBeTruthy();
    });
  });

  // ── updateBudgetGoalLinkProgress ──────────────────────────────────────────
  describe('updateBudgetGoalLinkProgress', () => {
    it('returns updated link on success', async () => {
      const updated = { ...MOCK_LINK, current_amount: 350, current_percentage: 70 };
      const chain = createChainMock({ data: updated, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await updateBudgetGoalLinkProgress('link-1', 350, 70);

      expect(result.current_amount).toBe(350);
    });

    it('throws when update fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(updateBudgetGoalLinkProgress('link-1', 100)).rejects.toBeTruthy();
    });
  });

  // ── deleteBudgetGoalLink ──────────────────────────────────────────────────
  describe('deleteBudgetGoalLink', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBudgetGoalLink('link-1')).resolves.toBeUndefined();
    });

    it('throws when delete fails', async () => {
      const chain = createChainMock({ error: { message: 'Delete failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBudgetGoalLink('link-1')).rejects.toBeTruthy();
    });
  });
});
