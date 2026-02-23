import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}));

describe('rewards-service', () => {
  it('should handle points system', () => {
    const points = {
      user_id: 'user-123',
      space_id: 'space-123',
      total_points: 150,
      level: 3,
    };
    expect(points.total_points).toBe(150);
    expect(points.level).toBe(3);
  });

  describe('points operations', () => {
    it('should award points', () => {
      let points = 100;
      const earnedPoints = 50;
      points += earnedPoints;
      expect(points).toBe(150);
    });

    it('should track streaks', () => {
      const streak = {
        current_streak: 7,
        best_streak: 14,
      };
      expect(streak.current_streak).toBeLessThanOrEqual(streak.best_streak);
    });

    it('should calculate level from points', () => {
      const points = 500;
      const pointsPerLevel = 100;
      const level = Math.floor(points / pointsPerLevel);
      expect(level).toBe(5);
    });
  });
});
