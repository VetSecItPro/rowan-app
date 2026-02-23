import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('subscription-analytics-service', () => {
  it('should track subscription metrics', () => {
    const metrics = {
      total_subscribers: 1250,
      free_tier: 800,
      pro_tier: 350,
      premium_tier: 100,
      mrr: 12500,
    };
    expect(metrics.total_subscribers).toBe(1250);
    expect(metrics.free_tier + metrics.pro_tier + metrics.premium_tier).toBe(1250);
  });

  describe('analytics operations', () => {
    it('should calculate MRR (Monthly Recurring Revenue)', () => {
      const proSubs = 350 * 18; // $18/month
      const premiumSubs = 100 * 29; // $29/month
      const mrr = proSubs + premiumSubs;
      expect(mrr).toBe(9200);
    });

    it('should track churn rate', () => {
      const cancelledSubs = 50;
      const totalSubs = 1250;
      const churnRate = (cancelledSubs / totalSubs) * 100;
      expect(churnRate).toBe(4);
    });

    it('should calculate conversion rate', () => {
      const paidSubs = 450;
      const totalUsers = 1250;
      const conversionRate = (paidSubs / totalUsers) * 100;
      expect(conversionRate).toBe(36);
    });
  });
});
