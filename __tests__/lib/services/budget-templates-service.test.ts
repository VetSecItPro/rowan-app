import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBudgetTemplates,
  getTemplatesByHouseholdType,
  getTemplateById,
  getTemplateCategories,
  previewTemplateAllocation,
  applyTemplate,
  getBudgetCategories,
  getBudgetCategoriesWithProgress,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  updateCategorySpentAmount,
  getCategoryBudgetStats,
} from '@/lib/services/budget-templates-service';

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

const mockClient = { from: vi.fn(), rpc: vi.fn() };

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockClient,
}));

const MOCK_TEMPLATE = {
  id: 'tmpl-1',
  name: 'Family Budget',
  description: 'For families',
  household_type: 'family_small' as const,
  icon: '👨‍👩‍👧',
  recommended_income_min: 50000,
  recommended_income_max: 100000,
  is_active: true,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_CATEGORY = {
  id: 'cat-1',
  space_id: 'space-1',
  category_name: 'Housing',
  allocated_amount: 1500,
  spent_amount: 1200,
  icon: '🏠',
  color: '#3B82F6',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('budget-templates-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getBudgetTemplates ────────────────────────────────────────────────────
  describe('getBudgetTemplates', () => {
    it('returns active templates', async () => {
      const chain = createChainMock({ data: [MOCK_TEMPLATE], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetTemplates();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Family Budget');
    });

    it('returns empty array when no templates', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetTemplates();

      expect(result).toEqual([]);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getBudgetTemplates()).rejects.toBeTruthy();
    });
  });

  // ── getTemplatesByHouseholdType ───────────────────────────────────────────
  describe('getTemplatesByHouseholdType', () => {
    it('returns templates for the given household type', async () => {
      const chain = createChainMock({ data: [MOCK_TEMPLATE], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getTemplatesByHouseholdType('family_small');

      expect(result).toHaveLength(1);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getTemplatesByHouseholdType('single')).rejects.toBeTruthy();
    });
  });

  // ── getTemplateById ───────────────────────────────────────────────────────
  describe('getTemplateById', () => {
    it('returns template by id', async () => {
      const chain = createChainMock({ data: MOCK_TEMPLATE, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getTemplateById('tmpl-1');

      expect(result).toEqual(MOCK_TEMPLATE);
    });

    it('throws when query fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Not found' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getTemplateById('tmpl-1')).rejects.toBeTruthy();
    });
  });

  // ── getTemplateCategories ─────────────────────────────────────────────────
  describe('getTemplateCategories', () => {
    it('returns template categories', async () => {
      const templateCat = { id: 'tc-1', template_id: 'tmpl-1', category_name: 'Housing', percentage: 30, icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' };
      const chain = createChainMock({ data: [templateCat], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getTemplateCategories('tmpl-1');

      expect(result).toHaveLength(1);
    });
  });

  // ── previewTemplateAllocation ─────────────────────────────────────────────
  describe('previewTemplateAllocation', () => {
    const categories = [
      { id: 'tc-1', template_id: 'tmpl-1', category_name: 'Housing', percentage: 30, icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' },
      { id: 'tc-2', template_id: 'tmpl-1', category_name: 'Food', percentage: 15, icon: null, color: null, description: null, sort_order: 2, created_at: '2026-01-01' },
    ];

    it('calculates amounts based on income', () => {
      const result = previewTemplateAllocation(categories, 5000);

      expect(result[0].calculated_amount).toBe(1500);
      expect(result[1].calculated_amount).toBe(750);
    });

    it('returns zero amounts for zero income', () => {
      const result = previewTemplateAllocation(categories, 0);

      expect(result[0].calculated_amount).toBe(0);
    });
  });

  // ── applyTemplate ─────────────────────────────────────────────────────────
  describe('applyTemplate', () => {
    it('calls rpc to apply template', async () => {
      mockClient.rpc.mockResolvedValue({ error: null });

      await applyTemplate({ space_id: 'space-1', template_id: 'tmpl-1', monthly_income: 5000 });

      expect(mockClient.rpc).toHaveBeenCalledWith('apply_budget_template', expect.any(Object));
    });

    it('throws when rpc fails', async () => {
      mockClient.rpc.mockResolvedValue({ error: { message: 'RPC error' } });

      await expect(
        applyTemplate({ space_id: 'space-1', template_id: 'tmpl-1', monthly_income: 5000 })
      ).rejects.toBeTruthy();
    });
  });

  // ── getBudgetCategories ───────────────────────────────────────────────────
  describe('getBudgetCategories', () => {
    it('returns budget categories for a space', async () => {
      const chain = createChainMock({ data: [MOCK_CATEGORY], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetCategories('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].category_name).toBe('Housing');
    });
  });

  // ── getBudgetCategoriesWithProgress ───────────────────────────────────────
  describe('getBudgetCategoriesWithProgress', () => {
    it('adds progress calculations to categories', async () => {
      const chain = createChainMock({ data: [MOCK_CATEGORY], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetCategoriesWithProgress('space-1');

      expect(result[0].percentage_spent).toBe(80);
      expect(result[0].remaining_amount).toBe(300);
    });

    it('handles zero allocated amount without division error', async () => {
      const zeroCat = { ...MOCK_CATEGORY, allocated_amount: 0, spent_amount: 0 };
      const chain = createChainMock({ data: [zeroCat], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getBudgetCategoriesWithProgress('space-1');

      expect(result[0].percentage_spent).toBe(0);
    });
  });

  // ── createBudgetCategory ──────────────────────────────────────────────────
  describe('createBudgetCategory', () => {
    it('returns the created category', async () => {
      const chain = createChainMock({ data: MOCK_CATEGORY, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createBudgetCategory({
        space_id: 'space-1',
        category_name: 'Housing',
        allocated_amount: 1500,
        icon: null,
        color: null,
      });

      expect(result).toEqual(MOCK_CATEGORY);
    });

    it('throws when insert fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        createBudgetCategory({ space_id: 'space-1', category_name: 'X', allocated_amount: 0, icon: null, color: null })
      ).rejects.toBeTruthy();
    });
  });

  // ── updateBudgetCategory ──────────────────────────────────────────────────
  describe('updateBudgetCategory', () => {
    it('returns updated category', async () => {
      const updated = { ...MOCK_CATEGORY, allocated_amount: 2000 };
      const chain = createChainMock({ data: updated, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await updateBudgetCategory('cat-1', { allocated_amount: 2000 });

      expect(result.allocated_amount).toBe(2000);
    });
  });

  // ── deleteBudgetCategory ──────────────────────────────────────────────────
  describe('deleteBudgetCategory', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBudgetCategory('cat-1')).resolves.toBeUndefined();
    });

    it('throws when delete fails', async () => {
      const chain = createChainMock({ error: { message: 'Delete failed' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteBudgetCategory('cat-1')).rejects.toBeTruthy();
    });
  });

  // ── updateCategorySpentAmount ─────────────────────────────────────────────
  describe('updateCategorySpentAmount', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(updateCategorySpentAmount('space-1', 'Housing', 1300)).resolves.toBeUndefined();
    });
  });

  // ── getCategoryBudgetStats ────────────────────────────────────────────────
  describe('getCategoryBudgetStats', () => {
    it('calculates correct totals', async () => {
      const categories = [
        { ...MOCK_CATEGORY },
        { ...MOCK_CATEGORY, id: 'cat-2', allocated_amount: 500, spent_amount: 600 },
      ];
      const chain = createChainMock({ data: categories, error: null });
      mockClient.from.mockReturnValue(chain);

      const stats = await getCategoryBudgetStats('space-1');

      expect(stats.total_allocated).toBe(2000);
      expect(stats.total_spent).toBe(1800);
      expect(stats.categories_over_budget).toBe(1);
    });
  });
});
