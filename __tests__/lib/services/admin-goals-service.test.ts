import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase Admin mock ──────────────────────────────────────────────────────
function createChainMock(resolvedValue: unknown) {
  const mock: Record<string, unknown> = {};
  const handler = () => mock;
  ['select', 'eq', 'order', 'insert', 'update', 'delete', 'single', 'limit',
    'maybeSingle', 'gte', 'lte', 'lt', 'in', 'neq', 'is', 'not', 'upsert', 'match',
    'or', 'filter', 'ilike', 'rpc', 'range'].forEach(m => {
    mock[m] = vi.fn(handler);
  });
  mock.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(resolvedValue));
  return mock;
}

const mockAdminClient = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mockAdminClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { adminGoalsService } from '@/lib/services/admin-goals-service';

const MOCK_GOAL = {
  id: 'goal-1',
  metric_name: 'MRR',
  target_value: 10000,
  current_value: 5000,
  unit: 'USD',
  deadline: '2026-12-31',
  status: 'active',
  notes: null,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('adminGoalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getGoals ──────────────────────────────────────────────────────────────
  describe('getGoals', () => {
    it('returns array of active goals on success', async () => {
      const chain = createChainMock({ data: [MOCK_GOAL], error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.getGoals();

      expect(result).toEqual([MOCK_GOAL]);
    });

    it('returns empty array when no goals exist', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.getGoals();

      expect(result).toEqual([]);
    });

    it('throws error when database returns an error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockAdminClient.from.mockReturnValue(chain);

      await expect(adminGoalsService.getGoals()).rejects.toThrow('Failed to fetch goals');
    });
  });

  // ── createGoal ────────────────────────────────────────────────────────────
  describe('createGoal', () => {
    it('returns the created goal on success', async () => {
      const chain = createChainMock({ data: MOCK_GOAL, error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.createGoal({
        metric_name: 'MRR',
        target_value: 10000,
        unit: 'USD',
      });

      expect(result).toEqual(MOCK_GOAL);
    });

    it('defaults current_value to 0 when not provided', async () => {
      const chain = createChainMock({ data: { ...MOCK_GOAL, current_value: 0 }, error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.createGoal({
        metric_name: 'MAU',
        target_value: 500,
        unit: 'users',
      });

      expect(result.current_value).toBe(0);
    });

    it('throws error when insert fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Insert failed' } });
      mockAdminClient.from.mockReturnValue(chain);

      await expect(
        adminGoalsService.createGoal({ metric_name: 'X', target_value: 1, unit: 'n' })
      ).rejects.toThrow('Failed to create goal');
    });
  });

  // ── updateGoal ────────────────────────────────────────────────────────────
  describe('updateGoal', () => {
    it('returns the updated goal on success', async () => {
      const updated = { ...MOCK_GOAL, current_value: 7000 };
      const chain = createChainMock({ data: updated, error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.updateGoal('goal-1', { current_value: 7000 });

      expect(result.current_value).toBe(7000);
    });

    it('throws error when update fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Update failed' } });
      mockAdminClient.from.mockReturnValue(chain);

      await expect(
        adminGoalsService.updateGoal('goal-1', { current_value: 1 })
      ).rejects.toThrow('Failed to update goal');
    });

    it('can update status to archived', async () => {
      const archived = { ...MOCK_GOAL, status: 'archived' };
      const chain = createChainMock({ data: archived, error: null });
      mockAdminClient.from.mockReturnValue(chain);

      const result = await adminGoalsService.updateGoal('goal-1', { status: 'archived' });

      expect(result.status).toBe('archived');
    });
  });

  // ── deleteGoal ────────────────────────────────────────────────────────────
  describe('deleteGoal', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockAdminClient.from.mockReturnValue(chain);

      await expect(adminGoalsService.deleteGoal('goal-1')).resolves.toBeUndefined();
    });

    it('throws error when delete fails', async () => {
      const chain = createChainMock({ error: { message: 'Delete failed' } });
      mockAdminClient.from.mockReturnValue(chain);

      await expect(adminGoalsService.deleteGoal('goal-1')).rejects.toThrow('Failed to delete goal');
    });
  });
});
