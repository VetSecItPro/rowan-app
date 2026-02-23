import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getGoalMilestoneNotifications,
  getGoalMilestones,
  getCompletedMilestones,
  getNextMilestone,
  getRecentMilestoneCelebrations,
  hasCompletedMilestones,
  getMilestoneCompletionPercentage,
} from '@/lib/services/milestone-notification-service';

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
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const MOCK_NOTIFICATION = {
  id: 'notif-1',
  user_id: 'user-1',
  space_id: 'space-1',
  type: 'goal_milestone',
  title: 'Milestone Reached!',
  message: 'You reached 50%',
  link: null,
  read: false,
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_MILESTONE = {
  id: 'ms-1',
  goal_id: 'goal-1',
  title: '50% Complete',
  description: null,
  target_date: null,
  completed: false,
  completed_at: null,
  type: 'percentage',
  target_value: 50,
  current_value: 25,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('milestone-notification-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getUserNotifications ──────────────────────────────────────────────────
  describe('getUserNotifications', () => {
    it('returns notifications for a user', async () => {
      const chain = createChainMock({ data: [MOCK_NOTIFICATION], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
    });

    it('returns empty array on DB error (soft error handling)', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getUserNotifications('user-1');

      expect(result).toEqual([]);
    });

    it('returns empty array on thrown exception', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await getUserNotifications('user-1');

      expect(result).toEqual([]);
    });
  });

  // ── getUnreadNotificationCount ────────────────────────────────────────────
  describe('getUnreadNotificationCount', () => {
    it('returns count of unread notifications', async () => {
      const chain = createChainMock({ count: 5, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getUnreadNotificationCount('user-1');

      expect(result).toBe(5);
    });

    it('returns 0 on error', async () => {
      const chain = createChainMock({ count: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getUnreadNotificationCount('user-1');

      expect(result).toBe(0);
    });
  });

  // ── markNotificationAsRead ────────────────────────────────────────────────
  describe('markNotificationAsRead', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(markNotificationAsRead('notif-1')).resolves.toBeUndefined();
    });

    it('does not throw on DB error (soft handling)', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(markNotificationAsRead('notif-1')).resolves.toBeUndefined();
    });
  });

  // ── markAllNotificationsAsRead ────────────────────────────────────────────
  describe('markAllNotificationsAsRead', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(markAllNotificationsAsRead('user-1')).resolves.toBeUndefined();
    });

    it('does not throw on DB error (soft handling)', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(markAllNotificationsAsRead('user-1')).resolves.toBeUndefined();
    });
  });

  // ── deleteNotification ────────────────────────────────────────────────────
  describe('deleteNotification', () => {
    it('resolves without error on success', async () => {
      const chain = createChainMock({ error: null });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteNotification('notif-1')).resolves.toBeUndefined();
    });

    it('does not throw on DB error (soft handling)', async () => {
      const chain = createChainMock({ error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(deleteNotification('notif-1')).resolves.toBeUndefined();
    });
  });

  // ── getGoalMilestoneNotifications ─────────────────────────────────────────
  describe('getGoalMilestoneNotifications', () => {
    it('returns goal milestone notifications', async () => {
      const chain = createChainMock({ data: [MOCK_NOTIFICATION], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGoalMilestoneNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('goal_milestone');
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getGoalMilestoneNotifications('user-1')).rejects.toBeTruthy();
    });
  });

  // ── getGoalMilestones ─────────────────────────────────────────────────────
  describe('getGoalMilestones', () => {
    it('returns milestones for a goal', async () => {
      const chain = createChainMock({ data: [MOCK_MILESTONE], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGoalMilestones('goal-1');

      expect(result).toHaveLength(1);
      expect(result[0].goal_id).toBe('goal-1');
    });

    it('returns empty array when no milestones', async () => {
      const chain = createChainMock({ data: null, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getGoalMilestones('goal-1');

      expect(result).toEqual([]);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getGoalMilestones('goal-1')).rejects.toBeTruthy();
    });
  });

  // ── getCompletedMilestones ────────────────────────────────────────────────
  describe('getCompletedMilestones', () => {
    it('returns completed milestones', async () => {
      const completed = { ...MOCK_MILESTONE, completed: true, completed_at: '2026-01-15T00:00:00Z' };
      const chain = createChainMock({ data: [completed], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getCompletedMilestones('goal-1');

      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(true);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getCompletedMilestones('goal-1')).rejects.toBeTruthy();
    });
  });

  // ── getNextMilestone ──────────────────────────────────────────────────────
  describe('getNextMilestone', () => {
    it('returns next incomplete milestone', async () => {
      const chain = createChainMock({ data: MOCK_MILESTONE, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await getNextMilestone('goal-1');

      expect(result?.id).toBe('ms-1');
    });

    it('returns null when no milestone found (PGRST116)', async () => {
      const chain = createChainMock({ data: null, error: { code: 'PGRST116' } });
      mockClient.from.mockReturnValue(chain);

      const result = await getNextMilestone('goal-1');

      expect(result).toBeNull();
    });

    it('throws on non-PGRST116 errors', async () => {
      const chain = createChainMock({ data: null, error: { code: 'OTHER', message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getNextMilestone('goal-1')).rejects.toBeTruthy();
    });
  });

  // ── getRecentMilestoneCelebrations ────────────────────────────────────────
  describe('getRecentMilestoneCelebrations', () => {
    it('calls RPC and returns celebrations', async () => {
      const celebrations = [{ milestone_id: 'ms-1', goal_id: 'goal-1', goal_title: 'Save Money', milestone_title: '50%', milestone_description: null, completed_at: '2026-01-15', percentage_reached: 50 }];
      mockClient.rpc = vi.fn().mockResolvedValue({ data: celebrations, error: null });

      const result = await getRecentMilestoneCelebrations('space-1', 7);

      expect(result).toHaveLength(1);
      expect(mockClient.rpc).toHaveBeenCalledWith('get_recent_milestone_celebrations', {
        p_space_id: 'space-1',
        p_days: 7,
      });
    });

    it('throws on RPC error', async () => {
      mockClient.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      await expect(getRecentMilestoneCelebrations('space-1')).rejects.toBeTruthy();
    });
  });

  // ── hasCompletedMilestones ────────────────────────────────────────────────
  describe('hasCompletedMilestones', () => {
    it('returns true when completed milestones exist', async () => {
      const chain = createChainMock({ count: 3, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await hasCompletedMilestones('goal-1');

      expect(result).toBe(true);
    });

    it('returns false when no completed milestones', async () => {
      const chain = createChainMock({ count: 0, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await hasCompletedMilestones('goal-1');

      expect(result).toBe(false);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ count: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(hasCompletedMilestones('goal-1')).rejects.toBeTruthy();
    });
  });

  // ── getMilestoneCompletionPercentage ──────────────────────────────────────
  describe('getMilestoneCompletionPercentage', () => {
    it('returns percentage of completed milestones', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ count: 4, error: null }); // total count
        return createChainMock({ count: 2, error: null }); // completed count
      });

      const result = await getMilestoneCompletionPercentage('goal-1');

      expect(result).toBe(50);
    });

    it('returns 0 when no milestones exist', async () => {
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return createChainMock({ count: 0, error: null }); // total
        return createChainMock({ count: 0, error: null }); // completed
      });

      const result = await getMilestoneCompletionPercentage('goal-1');

      expect(result).toBe(0);
    });

    it('throws on DB error', async () => {
      const chain = createChainMock({ count: null, error: { message: 'Error' } });
      mockClient.from.mockReturnValue(chain);

      await expect(getMilestoneCompletionPercentage('goal-1')).rejects.toBeTruthy();
    });
  });
});
