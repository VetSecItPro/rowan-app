import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getExpenseSplits,
  getUserOwedExpenses,
  updateExpenseSplit,
  recalculateExpenseSplits,
  settleExpenseSplit,
  createSettlement,
  getSettlements,
  getSettlementsBetweenUsers,
  deleteSettlement,
  getPartnershipBalance,
  updateIncomes,
  calculateCurrentBalance,
  getSettlementSummary,
  calculateIncomeBasedSplit,
  suggestSplitType,
  getExpensesByOwnership,
  getSplitExpenseStats,
  getMonthlySettlementTrends,
} from '@/lib/services/expense-splitting-service';

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

const MOCK_SPLIT = {
  id: 'split-1',
  expense_id: 'exp-1',
  user_id: 'user-1',
  amount_owed: 50,
  amount_paid: 0,
  percentage: 50,
  is_payer: false,
  status: 'pending' as const,
  settled_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_SETTLEMENT = {
  id: 'settle-1',
  space_id: 'space-1',
  from_user_id: 'user-1',
  to_user_id: 'user-2',
  amount: 50,
  settlement_date: '2026-01-01',
  payment_method: null,
  reference_number: null,
  notes: null,
  expense_ids: null,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('expense-splitting-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getExpenseSplits ──────────────────────────────────────────────────────
  describe('getExpenseSplits', () => {
    it('returns splits for an expense', async () => {
      const chain = createChainMock({ data: [MOCK_SPLIT], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getExpenseSplits('exp-1');

      expect(result).toHaveLength(1);
      expect(result[0].expense_id).toBe('exp-1');
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getExpenseSplits('exp-1')).rejects.toBeTruthy();
    });
  });

  // ── getUserOwedExpenses ───────────────────────────────────────────────────
  describe('getUserOwedExpenses', () => {
    it('returns owed expenses for a user', async () => {
      const chain = createChainMock({
        data: [{ ...MOCK_SPLIT, expenses: { id: 'exp-1', space_id: 'space-1' } }],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserOwedExpenses('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].expense).toBeDefined();
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getUserOwedExpenses('user-1')).rejects.toBeTruthy();
    });
  });

  // ── updateExpenseSplit ────────────────────────────────────────────────────
  describe('updateExpenseSplit', () => {
    it('updates split and triggers recalculation', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);
      mockClient.rpc = vi.fn().mockResolvedValue({ error: null });

      // updateExpenseSplit calls from('expenses').update then rpc
      await updateExpenseSplit('exp-1', { is_split: true, ownership: 'shared' });

      expect(mockClient.from).toHaveBeenCalledWith('expenses');
    });

    it('throws on update error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(updateExpenseSplit('exp-1', {})).rejects.toBeTruthy();
    });
  });

  // ── recalculateExpenseSplits ──────────────────────────────────────────────
  describe('recalculateExpenseSplits', () => {
    it('calls RPC to recalculate', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);
      // recalculateExpenseSplits uses supabase.rpc directly
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      // We need to inject rpc on the client mock
      (mockClient as Record<string, unknown>).rpc = mockRpc;
      // The service calls createClient() which returns mockClient
      // recalculate calls mockClient.rpc(...)
      await recalculateExpenseSplits('exp-1');

      expect(mockRpc).toHaveBeenCalledWith('calculate_expense_splits', { p_expense_id: 'exp-1' });
    });

    it('throws when RPC errors', async () => {
      (mockClient as Record<string, unknown>).rpc = vi.fn().mockResolvedValue({ error: { message: 'RPC error' } });

      await expect(recalculateExpenseSplits('exp-1')).rejects.toBeTruthy();
    });
  });

  // ── settleExpenseSplit ────────────────────────────────────────────────────
  describe('settleExpenseSplit', () => {
    it('marks split as settled', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: MOCK_SPLIT, error: null });
        }
        return createChainMock({ error: null });
      });

      await expect(settleExpenseSplit('split-1', 50)).resolves.toBeUndefined();
    });

    it('throws when fetch fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(settleExpenseSplit('split-1')).rejects.toBeTruthy();
    });
  });

  // ── createSettlement ──────────────────────────────────────────────────────
  describe('createSettlement', () => {
    it('returns created settlement', async () => {
      const chain = createChainMock({ data: MOCK_SETTLEMENT, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await createSettlement({
        space_id: 'space-1',
        from_user_id: 'user-1',
        to_user_id: 'user-2',
        amount: 50,
        created_by: 'user-1',
      });

      expect(result.id).toBe('settle-1');
    });

    it('throws on insert error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(
        createSettlement({ space_id: 'space-1', from_user_id: 'u1', to_user_id: 'u2', amount: 50, created_by: 'u1' })
      ).rejects.toBeTruthy();
    });
  });

  // ── getSettlements ────────────────────────────────────────────────────────
  describe('getSettlements', () => {
    it('returns settlements for a space', async () => {
      const chain = createChainMock({ data: [MOCK_SETTLEMENT], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getSettlements('space-1');

      expect(result).toHaveLength(1);
    });

    it('throws on error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getSettlements('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getSettlementsBetweenUsers ────────────────────────────────────────────
  describe('getSettlementsBetweenUsers', () => {
    it('returns settlements between two users', async () => {
      const chain = createChainMock({ data: [MOCK_SETTLEMENT], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getSettlementsBetweenUsers('space-1', 'user-1', 'user-2');

      expect(result).toHaveLength(1);
    });
  });

  // ── deleteSettlement ──────────────────────────────────────────────────────
  describe('deleteSettlement', () => {
    it('resolves without error', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteSettlement('settle-1')).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteSettlement('settle-1')).rejects.toBeTruthy();
    });
  });

  // ── getPartnershipBalance ─────────────────────────────────────────────────
  describe('getPartnershipBalance', () => {
    it('returns partnership balance', async () => {
      const mockBalance = { id: 'bal-1', space_id: 'space-1', balance: 25 };
      const chain = createChainMock({ data: mockBalance, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getPartnershipBalance('space-1');

      expect(result?.id).toBe('bal-1');
    });

    it('returns null on PGRST116 (no rows)', async () => {
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getPartnershipBalance('space-1');

      expect(result).toBeNull();
    });

    it('throws for non-PGRST116 errors', async () => {
      const chain = createChainMock({ data: null, error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getPartnershipBalance('space-1')).rejects.toBeTruthy();
    });
  });

  // ── updateIncomes ─────────────────────────────────────────────────────────
  describe('updateIncomes', () => {
    it('resolves without error on upsert success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(updateIncomes('space-1', 'user-1', 6000, 'user-2', 4000)).resolves.toBeUndefined();
    });

    it('throws on upsert error', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(updateIncomes('space-1', 'user-1', 6000, 'user-2', 4000)).rejects.toBeTruthy();
    });
  });

  // ── calculateCurrentBalance ───────────────────────────────────────────────
  describe('calculateCurrentBalance', () => {
    it('returns balance summaries per user', async () => {
      const splits = [
        { ...MOCK_SPLIT, user_id: 'user-1', is_payer: true, amount_owed: 100, amount_paid: 0, expenses: { space_id: 'space-1' }, users: { email: 'alice@test.com' } },
        { ...MOCK_SPLIT, id: 'split-2', user_id: 'user-2', is_payer: false, amount_owed: 100, amount_paid: 0, expenses: { space_id: 'space-1' }, users: { email: 'bob@test.com' } },
      ];
      const chain = createChainMock({ data: splits, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await calculateCurrentBalance('space-1');

      expect(result.length).toBeGreaterThan(0);
      const payer = result.find(r => r.user_id === 'user-1');
      expect(payer?.amount_owed_to_them).toBe(100);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(calculateCurrentBalance('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getSettlementSummary ──────────────────────────────────────────────────
  describe('getSettlementSummary', () => {
    it('returns settlement summaries', async () => {
      const chain = createChainMock({
        data: [{ space_id: 'space-1', from_user_id: 'u1', to_user_id: 'u2', settlement_count: 3, total_settled: 150, first_settlement: null, last_settlement: null }],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getSettlementSummary('space-1');

      expect(result).toHaveLength(1);
    });
  });

  // ── calculateIncomeBasedSplit (pure function) ─────────────────────────────
  describe('calculateIncomeBasedSplit', () => {
    it('splits proportionally based on income', () => {
      const result = calculateIncomeBasedSplit(100, 6000, 4000);

      expect(result.user1Amount).toBe(60);
      expect(result.user2Amount).toBe(40);
      expect(result.user1Percentage).toBe(60);
      expect(result.user2Percentage).toBe(40);
    });

    it('falls back to 50/50 when both incomes are 0', () => {
      const result = calculateIncomeBasedSplit(100, 0, 0);

      expect(result.user1Amount).toBe(50);
      expect(result.user2Amount).toBe(50);
      expect(result.user1Percentage).toBe(50);
      expect(result.user2Percentage).toBe(50);
    });

    it('rounds to cents', () => {
      const result = calculateIncomeBasedSplit(100, 1, 2);

      expect(result.user1Amount).toBe(33.33);
      expect(result.user2Amount).toBe(66.67);
    });
  });

  // ── suggestSplitType (pure function) ─────────────────────────────────────
  describe('suggestSplitType', () => {
    it('suggests income-based for large shared expenses', () => {
      expect(suggestSplitType('Groceries', 1000)).toBe('income-based');
    });

    it('suggests equal for small shared expenses', () => {
      expect(suggestSplitType('Utilities', 100)).toBe('equal');
    });

    it('suggests equal for personal categories', () => {
      expect(suggestSplitType('Clothing', 200)).toBe('equal');
    });

    it('returns equal for unknown categories', () => {
      expect(suggestSplitType('Miscellaneous', 50)).toBe('equal');
    });
  });

  // ── getExpensesByOwnership ────────────────────────────────────────────────
  describe('getExpensesByOwnership', () => {
    it('returns ownership stats', async () => {
      const chain = createChainMock({
        data: [
          { ownership: 'shared', amount: 100 },
          { ownership: 'shared', amount: 50 },
          { ownership: 'yours', amount: 30 },
        ],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getExpensesByOwnership('space-1');

      const shared = result.find(r => r.ownership === 'shared');
      expect(shared?.total).toBe(150);
      expect(shared?.count).toBe(2);
    });

    it('throws on error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getExpensesByOwnership('space-1')).rejects.toBeTruthy();
    });
  });

  // ── getSplitExpenseStats ──────────────────────────────────────────────────
  describe('getSplitExpenseStats', () => {
    it('returns split stats', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainMock({ data: [{ id: 'exp-1', amount: 200 }], error: null });
        }
        return createChainMock({ data: [{ amount_owed: 100, amount_paid: 0 }], error: null });
      });

      const result = await getSplitExpenseStats('space-1');

      expect(result.totalSplit).toBe(200);
      expect(result.splitCount).toBe(1);
      expect(result.unsettledCount).toBe(1);
    });
  });

  // ── getMonthlySettlementTrends ────────────────────────────────────────────
  describe('getMonthlySettlementTrends', () => {
    it('returns monthly trend data', async () => {
      const chain = createChainMock({
        data: [
          { settlement_date: '2026-01-15', amount: 100 },
          { settlement_date: '2026-01-20', amount: 50 },
          { settlement_date: '2026-02-10', amount: 200 },
        ],
        error: null,
      });
      mockClient.from.mockReturnValue(chain);

      const result = await getMonthlySettlementTrends('space-1', 6);

      expect(result.length).toBeGreaterThan(0);
      const jan = result.find(r => r.month === '2026-01');
      expect(jan?.total).toBe(150);
      expect(jan?.count).toBe(2);
    });

    it('returns empty array when no settlements', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getMonthlySettlementTrends('space-1');

      expect(result).toEqual([]);
    });
  });
});
