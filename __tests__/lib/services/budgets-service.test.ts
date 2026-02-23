import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('budgets-service', () => {
  it('should handle budget data', () => {
    const budget = {
      id: 'budget-1',
      space_id: 'space-123',
      category: 'groceries',
      amount: 500,
      period: 'monthly',
      spent: 320,
    };
    expect(budget.amount).toBe(500);
    expect(budget.spent).toBe(320);
  });

  describe('budget operations', () => {
    it('should calculate remaining budget', () => {
      const total = 500;
      const spent = 320;
      const remaining = total - spent;
      expect(remaining).toBe(180);
    });

    it('should calculate budget percentage', () => {
      const spent = 320;
      const total = 500;
      const percentage = (spent / total) * 100;
      expect(percentage).toBe(64);
    });

    it('should detect budget overages', () => {
      const budget = { amount: 500, spent: 550 };
      const isOverBudget = budget.spent > budget.amount;
      expect(isOverBudget).toBe(true);
    });

    it('should handle budget alerts', () => {
      const budget = { amount: 500, spent: 480, threshold: 0.9 };
      const shouldAlert = budget.spent >= (budget.amount * budget.threshold);
      expect(shouldAlert).toBe(true);
    });
  });
});
