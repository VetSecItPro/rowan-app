import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to build a chainable Supabase query mock
function createQueryMock(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler = () => mock;

  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.order = vi.fn(handler);
  mock.single = vi.fn(handler);
  mock.in = vi.fn(handler);
  mock.insert = vi.fn(handler);
  mock.not = vi.fn(handler);
  mock.limit = vi.fn(handler);
  mock.then = vi.fn((resolve) =>
    resolve({ ...resolvedValue, count: resolvedValue.count ?? null })
  );

  return mock;
}

let fromHandler: (table: string) => ReturnType<typeof createQueryMock>;

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => fromHandler(table)),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Import after mocks are set up
const {
  getAllBadges,
  getUserBadges,
  getUserBadgeStats,
  checkAndAwardBadges,
} = await import('@/lib/services/achievement-service');

describe('achievement-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllBadges', () => {
    it('should fetch all badges sorted by rarity and points', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'First Goal', rarity: 'common', points: 10 },
        { id: 'badge2', name: 'Epic Achievement', rarity: 'epic', points: 100 },
      ];

      fromHandler = () => createQueryMock({ data: mockBadges, error: null });

      const result = await getAllBadges();
      expect(result).toEqual(mockBadges);
    });

    it('should return empty array on error', async () => {
      fromHandler = () => createQueryMock({ data: null, error: new Error('DB error') });

      const result = await getAllBadges();
      expect(result).toEqual([]);
    });
  });

  describe('getUserBadges', () => {
    it('should fetch user badges with badge details', async () => {
      const mockUserBadges = [
        {
          id: 'ua1',
          user_id: 'user1',
          space_id: 'space1',
          badge_id: 'badge1',
          earned_at: '2024-01-01',
          badge: { id: 'badge1', name: 'First Goal' },
        },
      ];

      fromHandler = () => createQueryMock({ data: mockUserBadges, error: null });

      const result = await getUserBadges('user1', 'space1');
      expect(result).toEqual(mockUserBadges);
    });

    it('should return empty array on error', async () => {
      fromHandler = () => createQueryMock({ data: null, error: new Error('DB error') });

      const result = await getUserBadges('user1', 'space1');
      expect(result).toEqual([]);
    });
  });

  describe('getUserBadgeStats', () => {
    it('should calculate badge statistics', async () => {
      const mockUserBadges = [
        {
          badge_id: 'badge1',
          badge: { id: 'badge1', category: 'goals', rarity: 'common', points: 10 },
        },
        {
          badge_id: 'badge2',
          badge: { id: 'badge2', category: 'streaks', rarity: 'rare', points: 50 },
        },
      ];

      // getUserBadgeStats calls getUserBadges internally
      fromHandler = () => createQueryMock({ data: mockUserBadges, error: null });

      const result = await getUserBadgeStats('user1', 'space1');

      expect(result.totalBadges).toBe(2);
      expect(result.totalPoints).toBe(60);
      expect(result.byRarity.common).toBe(1);
      expect(result.byRarity.rare).toBe(1);
      expect(result.byCategory.goals).toBe(1);
      expect(result.byCategory.streaks).toBe(1);
    });

    it('should return zero stats on error', async () => {
      fromHandler = () => createQueryMock({ data: null, error: new Error('DB error') });

      const result = await getUserBadgeStats('user1', 'space1');

      expect(result.totalBadges).toBe(0);
      expect(result.totalPoints).toBe(0);
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should return empty array on error', async () => {
      fromHandler = () => createQueryMock({ data: null, error: new Error('DB error') });

      const result = await checkAndAwardBadges('user1', 'space1');

      expect(result).toEqual([]);
    });
  });
});
