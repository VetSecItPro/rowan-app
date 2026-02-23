import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkBudgetThreshold,
  getSafeToSpendInfo,
  resetMonthlyAlerts,
} from '@/lib/services/budget-alerts-service';

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
vi.mock('sonner', () => ({
  toast: { warning: vi.fn() },
}));

const mockGetBudget = vi.fn();
const mockGetBudgetStats = vi.fn();

vi.mock('@/lib/services/budgets-service', () => ({
  projectsService: {
    getBudget: (...args: unknown[]) => mockGetBudget(...args),
    getBudgetStats: (...args: unknown[]) => mockGetBudgetStats(...args),
  },
}));

describe('budget-alerts-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── checkBudgetThreshold ──────────────────────────────────────────────────
  describe('checkBudgetThreshold', () => {
    it('returns shouldAlert:false when no budget configured', async () => {
      mockGetBudget.mockResolvedValue(null);

      const result = await checkBudgetThreshold('space-1');

      expect(result.shouldAlert).toBe(false);
      expect(result.budget).toBe(0);
    });

    it('returns shouldAlert:false when budget is zero', async () => {
      mockGetBudget.mockResolvedValue({ monthly_budget: 0 });

      const result = await checkBudgetThreshold('space-1');

      expect(result.shouldAlert).toBe(false);
    });

    it('detects 90% threshold crossing', async () => {
      mockGetBudget.mockResolvedValue({
        monthly_budget: 1000,
        notifications_enabled: true,
        threshold_90_enabled: true,
        last_alert_threshold: null,
      });
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 950,
        remaining: 50,
      });

      const result = await checkBudgetThreshold('space-1');

      expect(result.threshold).toBe(90);
      expect(result.shouldAlert).toBe(true);
    });

    it('detects 75% threshold crossing', async () => {
      mockGetBudget.mockResolvedValue({
        monthly_budget: 1000,
        notifications_enabled: true,
        threshold_75_enabled: true,
        threshold_90_enabled: true,
        last_alert_threshold: null,
      });
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 800,
        remaining: 200,
      });

      const result = await checkBudgetThreshold('space-1');

      expect(result.threshold).toBe(75);
    });

    it('does not alert when threshold already alerted', async () => {
      mockGetBudget.mockResolvedValue({
        monthly_budget: 1000,
        notifications_enabled: true,
        threshold_90_enabled: true,
        last_alert_threshold: 90,
      });
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 950,
        remaining: 50,
      });

      const result = await checkBudgetThreshold('space-1');

      expect(result.shouldAlert).toBe(false);
    });
  });

  // ── getSafeToSpendInfo ────────────────────────────────────────────────────
  describe('getSafeToSpendInfo', () => {
    it('returns safe status when under 75%', async () => {
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 400,
        remaining: 600,
      });

      const result = await getSafeToSpendInfo('space-1');

      expect(result.status).toBe('safe');
      expect(result.safeToSpend).toBe(600);
    });

    it('returns over status when remaining is negative', async () => {
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 1200,
        remaining: -200,
      });

      const result = await getSafeToSpendInfo('space-1');

      expect(result.status).toBe('over');
      expect(result.safeToSpend).toBe(200);
    });

    it('returns danger status when at or above 90%', async () => {
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 1000,
        spentThisMonth: 920,
        remaining: 80,
      });

      const result = await getSafeToSpendInfo('space-1');

      expect(result.status).toBe('danger');
    });

    it('handles zero budget', async () => {
      mockGetBudgetStats.mockResolvedValue({
        monthlyBudget: 0,
        spentThisMonth: 0,
        remaining: 0,
      });

      const result = await getSafeToSpendInfo('space-1');

      expect(result.percentageUsed).toBe(0);
    });
  });

  // ── resetMonthlyAlerts ────────────────────────────────────────────────────
  describe('resetMonthlyAlerts', () => {
    it('calls update on budgets table', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await resetMonthlyAlerts('space-1');

      expect(mockClient.from).toHaveBeenCalledWith('budgets');
    });
  });
});
