import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spendingPatternService } from '@/lib/services/spending-pattern-service';

const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/cache', () => ({
  cacheAside: vi.fn((_key: string, fn: () => unknown) => fn()),
  cacheKeys: {
    spendingPatterns: vi.fn(() => 'patterns-key'),
    spendingTrends: vi.fn(() => 'trends-key'),
  },
  CACHE_TTL: { MEDIUM: 300 },
}));

describe('spendingPatternService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.gte.mockReturnValue(mockSupabase);
    mockSupabase.lte.mockResolvedValue({ data: [], error: null });
    mockSupabase.order.mockResolvedValue({ data: [], error: null });
  });

  describe('analyzeSpendingPatterns', () => {
    it('should analyze spending patterns over months', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [
          { category: 'Food', amount: 100, date: '2024-01-15' },
          { category: 'Food', amount: 120, date: '2024-02-15' },
        ],
        error: null,
      });

      const result = await spendingPatternService.analyzeSpendingPatterns('space1', 6);

      expect(result).toBeInstanceOf(Array);
      result.forEach((pattern) => {
        expect(pattern).toHaveProperty('category');
        expect(pattern).toHaveProperty('average_monthly');
        expect(pattern).toHaveProperty('trend');
        expect(pattern).toHaveProperty('predictability');
      });
    });

    it('should detect increasing trends', async () => {
      // To detect an increasing trend, recent months need higher spending than older months
      // The algorithm compares recent 3 months vs older 3 months
      // monthIndex 0 = current month, 1 = last month, etc.
      // "recent" = indices 0,1,2 and "older" = indices 3,4,5
      // We need recent avg > older avg by more than 10%
      const now = new Date();
      const expenses = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const dateStr = date.toISOString().split('T')[0];
        // Recent months (i=0,1,2) have higher amounts than older months (i=3,4,5)
        const amount = i < 3 ? 200 : 100;
        expenses.push({
          category: 'Food',
          amount,
          date: dateStr,
        });
      }

      mockSupabase.lte.mockResolvedValueOnce({ data: expenses, error: null });

      const result = await spendingPatternService.analyzeSpendingPatterns('space1', 6);

      const foodPattern = result.find((p) => p.category === 'Food');
      expect(foodPattern?.trend).toBe('increasing');
    });
  });

  describe('forecastNextMonthSpending', () => {
    it('should forecast next month spending', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 100, date: '2024-01-15' }],
        error: null,
      });

      const result = await spendingPatternService.forecastNextMonthSpending('space1');

      expect(result).toBeInstanceOf(Array);
      result.forEach((forecast) => {
        expect(forecast).toHaveProperty('category');
        expect(forecast).toHaveProperty('next_month_prediction');
        expect(forecast).toHaveProperty('confidence');
        expect(forecast.confidence).toBeGreaterThanOrEqual(0);
        expect(forecast.confidence).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('generateSpendingInsights', () => {
    it('should generate actionable insights', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 100, date: '2024-01-15' }],
        error: null,
      });

      const result = await spendingPatternService.generateSpendingInsights('space1');

      expect(result).toBeInstanceOf(Array);
      result.forEach((insight) => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('category');
        expect(insight).toHaveProperty('message');
        expect(['warning', 'tip', 'achievement']).toContain(insight.type);
      });
    });
  });

  describe('analyzeDayOfWeekPatterns', () => {
    it('should analyze spending by day of week', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [{ date: '2024-01-15', amount: 100 }],
        error: null,
      });

      const result = await spendingPatternService.analyzeDayOfWeekPatterns('space1', 3);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(7); // 7 days of the week
      result.forEach((pattern) => {
        expect(pattern).toHaveProperty('day');
        expect(pattern).toHaveProperty('average_spending');
        expect(pattern).toHaveProperty('transaction_count');
      });
    });
  });

  describe('getMonthlyTrends', () => {
    it('should return monthly spending trends', async () => {
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 100, date: '2024-01-15' }],
        error: null,
      });

      const result = await spendingPatternService.getMonthlyTrends('space1', 12);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(12);
      result.forEach((trend) => {
        expect(trend).toHaveProperty('month');
        expect(trend).toHaveProperty('total');
        expect(trend).toHaveProperty('categories');
      });
    });
  });

  describe('detectSpendingAnomalies', () => {
    it('should detect unusual spending patterns', async () => {
      // First call: analyzeSpendingPatterns fetches historical data
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 100, date: '2024-01-15' }],
        error: null,
      });

      // Second call: detectSpendingAnomalies fetches current month data
      mockSupabase.lte.mockResolvedValueOnce({
        data: [{ category: 'Food', amount: 100, date: '2024-01-15' }],
        error: null,
      });

      const result = await spendingPatternService.detectSpendingAnomalies('space1');

      expect(result).toBeInstanceOf(Array);
      result.forEach((anomaly) => {
        expect(anomaly).toHaveProperty('type');
        expect(anomaly).toHaveProperty('category');
        expect(anomaly).toHaveProperty('message');
        expect(anomaly).toHaveProperty('severity');
      });
    });
  });
});
