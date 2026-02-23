import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spendingInsightsService } from '@/lib/services/spending-insights-service';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  gte: vi.fn(() => mockSupabaseClient),
  lte: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('spendingInsightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSpendingTrends', () => {
    it('should return spending trends for specified periods', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValueOnce({
        data: [
          { amount: 100, created_at: new Date().toISOString() },
        ],
        error: null,
      });

      const result = await spendingInsightsService.getSpendingTrends('space1', 'monthly', 6);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(6);
      result.forEach((trend) => {
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('total_spent');
        expect(trend).toHaveProperty('transaction_count');
      });
    });

    it('should handle empty expenses', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await spendingInsightsService.getSpendingTrends('space1');

      expect(result).toBeInstanceOf(Array);
      result.forEach((trend) => {
        expect(trend.total_spent).toBe(0);
        expect(trend.transaction_count).toBe(0);
      });
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      await expect(spendingInsightsService.getSpendingTrends('space1')).rejects.toThrow('DB error');
    });
  });

  describe('getCategorySpending', () => {
    it('should return spending by category', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [
          { category: 'Food', amount: 100 },
          { category: 'Food', amount: 50 },
          { category: 'Transport', amount: 30 },
        ],
        error: null,
      });

      const result = await spendingInsightsService.getCategorySpending('space1');

      expect(result).toBeInstanceOf(Array);
      expect(result[0].total).toBe(150); // Food
      expect(result[0].percentage).toBeGreaterThan(0);
    });

    it('should handle uncategorized expenses', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [{ category: null, amount: 50 }],
        error: null,
      });

      const result = await spendingInsightsService.getCategorySpending('space1');

      const uncategorized = result.find((c) => c.category === 'Uncategorized');
      expect(uncategorized).toBeDefined();
    });
  });

  describe('getBudgetVariances', () => {
    it('should calculate variances correctly', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ category_name: 'Food', allocated_amount: 200 }],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 150 }],
        error: null,
      });

      const result = await spendingInsightsService.getBudgetVariances('space1');

      expect(result).toBeInstanceOf(Array);
      expect(result[0].variance).toBe(50); // 200 - 150
      expect(result[0].status).toBe('under');
    });

    it('should detect over-budget categories', async () => {
      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ category_name: 'Food', allocated_amount: 100 }],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 150 }],
        error: null,
      });

      const result = await spendingInsightsService.getBudgetVariances('space1');

      expect(result[0].status).toBe('over');
      expect(result[0].variance).toBeLessThan(0);
    });
  });

  describe('getSpendingInsights', () => {
    it('should return comprehensive insights', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.order.mockResolvedValue({ data: [], error: null });

      const result = await spendingInsightsService.getSpendingInsights('space1');

      expect(result).toHaveProperty('current_period');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('top_categories');
      expect(result).toHaveProperty('budget_variances');
    });
  });

  describe('getMonthOverMonthComparison', () => {
    it('should compare current and previous month spending', async () => {
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.lte.mockResolvedValue({ data: [{ amount: 100 }], error: null });

      const result = await spendingInsightsService.getMonthOverMonthComparison('space1');

      expect(result).toHaveProperty('current_month');
      expect(result).toHaveProperty('previous_month');
      expect(result).toHaveProperty('change');
      expect(result).toHaveProperty('change_percentage');
    });
  });
});
