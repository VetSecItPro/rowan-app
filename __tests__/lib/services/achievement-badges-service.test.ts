import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllBadges,
  getBadgesByCategory,
  getUserBadges,
  getUserBadgeProgress,
  getUserBadgeStats,
  checkAndAwardBadges,
  updateBadgeProgress,
  getRecentBadgeActivities,
  getBadgeRarityColor,
  getBadgeCategoryIcon,
  formatBadgePoints,
  getAchievementLevel,
} from '@/lib/services/achievement-badges-service';

// Helper to build a chainable Supabase query mock
function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler = () => mock;

  mock.select = vi.fn(handler);
  mock.eq = vi.fn(handler);
  mock.order = vi.fn(handler);
  mock.limit = vi.fn(handler);
  mock.upsert = vi.fn(handler);
  mock.single = vi.fn(handler);
  mock.then = vi.fn((resolve) => resolve(resolvedValue));

  return mock;
}

const mockRpc = vi.fn();
let fromImpl: (table: string) => ReturnType<typeof createQueryMock>;

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => fromImpl(table)),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

describe('achievement-badges-service', () => {
  let defaultQuery: ReturnType<typeof createQueryMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultQuery = createQueryMock({ data: [], error: null });
    fromImpl = () => defaultQuery;
  });

  describe('getAllBadges', () => {
    it('should fetch all active badges', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'First Goal', category: 'goals', rarity: 'common', points: 10 },
        { id: 'badge2', name: 'Streak Master', category: 'streaks', rarity: 'rare', points: 50 },
      ];

      defaultQuery = createQueryMock({ data: mockBadges, error: null });
      fromImpl = () => defaultQuery;

      const result = await getAllBadges();

      expect(result).toEqual(mockBadges);
      expect(defaultQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw error on database failure', async () => {
      defaultQuery = createQueryMock({ data: null, error: new Error('DB error') });
      fromImpl = () => defaultQuery;

      await expect(getAllBadges()).rejects.toThrow('DB error');
    });
  });

  describe('getBadgesByCategory', () => {
    it('should fetch badges by category', async () => {
      const mockBadges = [
        { id: 'badge1', name: 'Goal Starter', category: 'goals', points: 10 },
      ];

      defaultQuery = createQueryMock({ data: mockBadges, error: null });
      fromImpl = () => defaultQuery;

      const result = await getBadgesByCategory('goals');

      expect(defaultQuery.eq).toHaveBeenCalledWith('category', 'goals');
      expect(defaultQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual(mockBadges);
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

      defaultQuery = createQueryMock({ data: mockUserBadges, error: null });
      fromImpl = () => defaultQuery;

      const result = await getUserBadges('user1', 'space1');

      expect(defaultQuery.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(defaultQuery.eq).toHaveBeenCalledWith('space_id', 'space1');
      expect(result).toEqual(mockUserBadges);
    });
  });

  describe('getUserBadgeProgress', () => {
    it('should fetch user badge progress', async () => {
      const mockProgress = [
        {
          id: 'prog1',
          user_id: 'user1',
          space_id: 'space1',
          badge_id: 'badge1',
          current_progress: 5,
          target_progress: 10,
        },
      ];

      defaultQuery = createQueryMock({ data: mockProgress, error: null });
      fromImpl = () => defaultQuery;

      const result = await getUserBadgeProgress('user1', 'space1');

      expect(result).toEqual(mockProgress);
    });
  });

  describe('getUserBadgeStats', () => {
    it('should calculate badge statistics', async () => {
      const allBadges = [
        { id: 'badge1', category: 'goals', rarity: 'common', points: 10, is_active: true },
        { id: 'badge2', category: 'streaks', rarity: 'rare', points: 50, is_active: true },
        { id: 'badge3', category: 'goals', rarity: 'epic', points: 100, is_active: true },
      ];

      const userBadges = [
        { badge_id: 'badge1', badge: allBadges[0] },
        { badge_id: 'badge2', badge: allBadges[1] },
      ];

      // getUserBadgeStats calls getAllBadges() and getUserBadges() via Promise.all
      // Each creates its own supabase client. We use a call counter.
      let fromCallCount = 0;
      fromImpl = () => {
        fromCallCount++;
        // First from() call is getAllBadges -> achievement_badges
        if (fromCallCount === 1) {
          return createQueryMock({ data: allBadges, error: null });
        }
        // Second from() call is getUserBadges -> user_achievements
        return createQueryMock({ data: userBadges, error: null });
      };

      const result = await getUserBadgeStats('user1', 'space1');

      expect(result.total_badges).toBe(3);
      expect(result.earned_badges).toBe(2);
      expect(result.total_points).toBe(60);
      expect(result.badges_by_rarity.common).toBe(1);
      expect(result.badges_by_rarity.rare).toBe(1);
      expect(result.badges_by_category.goals).toBe(1);
      expect(result.badges_by_category.streaks).toBe(1);
      expect(result.completion_percentage).toBe(67);
    });
  });

  describe('checkAndAwardBadges', () => {
    it('should award new badges via RPC', async () => {
      const mockResponse = {
        badges_awarded: [
          { id: 'badge1', name: 'First Goal', category: 'goals', points: 10 },
        ],
      };

      mockRpc.mockResolvedValue({ data: mockResponse, error: null });

      const result = await checkAndAwardBadges('user1', 'space1', 'manual_check');

      expect(mockRpc).toHaveBeenCalledWith('check_and_award_badges', {
        p_user_id: 'user1',
        p_space_id: 'space1',
        p_trigger_type: 'manual_check',
      });

      expect(result).toHaveLength(1);
      expect(result[0].badge_id).toBe('badge1');
      expect(result[0].user_id).toBe('user1');
      expect(result[0].space_id).toBe('space1');
    });

    it('should handle RPC errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });

      await expect(checkAndAwardBadges('user1', 'space1')).rejects.toThrow('RPC error');
    });
  });

  describe('updateBadgeProgress', () => {
    it('should update badge progress and check for awarding', async () => {
      const badgeMock = createQueryMock({
        data: { criteria: { count: 10 } },
        error: null,
      });

      const progressMock = createQueryMock({ data: null, error: null });

      fromImpl = (table: string) => {
        if (table === 'achievement_badges') return badgeMock;
        return progressMock;
      };

      mockRpc.mockResolvedValue({ data: { badges_awarded: [] }, error: null });

      await updateBadgeProgress('user1', 'space1', 'badge1', 10, { detail: 'progress' });

      expect(badgeMock.select).toHaveBeenCalled();
      expect(progressMock.upsert).toHaveBeenCalled();
    });

    it('should use target from criteria if count not present', async () => {
      const badgeMock = createQueryMock({
        data: { criteria: { target: 50 } },
        error: null,
      });

      const progressMock = createQueryMock({ data: null, error: null });
      progressMock.upsert = vi.fn((data, opts) => {
        // Store args and continue chain
        return progressMock;
      });

      fromImpl = (table: string) => {
        if (table === 'achievement_badges') return badgeMock;
        return progressMock;
      };

      mockRpc.mockResolvedValue({ data: { badges_awarded: [] }, error: null });

      await updateBadgeProgress('user1', 'space1', 'badge1', 25);

      expect(progressMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ target_progress: 50 }),
        { onConflict: 'user_id,space_id,badge_id' }
      );
    });
  });

  describe('getRecentBadgeActivities', () => {
    it('should fetch recent badge activities with limit', async () => {
      const mockActivities = [
        { id: 'act1', badge: { name: 'Badge1' }, user: { email: 'user@test.com' } },
      ];

      defaultQuery = createQueryMock({ data: mockActivities, error: null });
      fromImpl = () => defaultQuery;

      const result = await getRecentBadgeActivities('space1', 5);

      expect(defaultQuery.eq).toHaveBeenCalledWith('space_id', 'space1');
      expect(defaultQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockActivities);
    });

    it('should use default limit of 10', async () => {
      defaultQuery = createQueryMock({ data: [], error: null });
      fromImpl = () => defaultQuery;

      await getRecentBadgeActivities('space1');

      expect(defaultQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('utility functions', () => {
    describe('getBadgeRarityColor', () => {
      it('should return correct color for each rarity', () => {
        expect(getBadgeRarityColor('common')).toBe('gray');
        expect(getBadgeRarityColor('uncommon')).toBe('green');
        expect(getBadgeRarityColor('rare')).toBe('blue');
        expect(getBadgeRarityColor('epic')).toBe('purple');
        expect(getBadgeRarityColor('legendary')).toBe('orange');
      });

      it('should return gray for unknown rarity', () => {
        expect(getBadgeRarityColor('unknown' as any)).toBe('gray');
      });
    });

    describe('getBadgeCategoryIcon', () => {
      it('should return correct icon for each category', () => {
        expect(getBadgeCategoryIcon('goals')).toBe('Target');
        expect(getBadgeCategoryIcon('milestones')).toBe('Flag');
        expect(getBadgeCategoryIcon('streaks')).toBe('Flame');
        expect(getBadgeCategoryIcon('social')).toBe('Users');
        expect(getBadgeCategoryIcon('special')).toBe('Star');
        expect(getBadgeCategoryIcon('seasonal')).toBe('Calendar');
      });

      it('should return Award for unknown category', () => {
        expect(getBadgeCategoryIcon('unknown' as any)).toBe('Award');
      });
    });

    describe('formatBadgePoints', () => {
      it('should format large numbers with k suffix', () => {
        expect(formatBadgePoints(1000)).toBe('1.0k');
        expect(formatBadgePoints(1500)).toBe('1.5k');
        expect(formatBadgePoints(10000)).toBe('10.0k');
      });

      it('should return number as string for small values', () => {
        expect(formatBadgePoints(10)).toBe('10');
        expect(formatBadgePoints(999)).toBe('999');
      });
    });

    describe('getAchievementLevel', () => {
      it('should return correct level for Beginner', () => {
        const result = getAchievementLevel(50);
        expect(result.level).toBe(1);
        expect(result.title).toBe('Beginner');
        expect(result.nextLevelPoints).toBe(100);
      });

      it('should return correct level for Achiever', () => {
        const result = getAchievementLevel(150);
        expect(result.level).toBe(2);
        expect(result.title).toBe('Achiever');
        expect(result.nextLevelPoints).toBe(250);
      });

      it('should return max level for Mythic', () => {
        const result = getAchievementLevel(2500);
        expect(result.level).toBe(6);
        expect(result.title).toBe('Mythic');
        expect(result.nextLevelPoints).toBe(2000);
      });

      it('should handle exact threshold values', () => {
        const result = getAchievementLevel(100);
        expect(result.level).toBe(2);
        expect(result.title).toBe('Achiever');
      });
    });
  });
});
