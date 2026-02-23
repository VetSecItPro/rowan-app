import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enhancedNotificationService } from '@/lib/services/enhanced-notification-service';

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
vi.mock('@/lib/services/push-service', () => ({
  pushService: {
    sendNotification: vi.fn().mockResolvedValue({ success: true }),
  },
}));
vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn(),
}));

import { csrfFetch } from '@/lib/utils/csrf-fetch';
const mockCsrfFetch = vi.mocked(csrfFetch);

describe('enhanced-notification-service', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── getSpaceMembers ──────────────────────────────────────────────────────
  describe('getSpaceMembers', () => {
    it('returns mapped space members on success', async () => {
      const rawMembers = [
        { user_id: 'user-1', users: { email: 'alice@test.com', name: 'Alice' } },
      ];
      const chain = createChainMock({ data: rawMembers, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.getSpaceMembers('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user-1');
      expect(result[0].email).toBe('alice@test.com');
      expect(result[0].name).toBe('Alice');
    });

    it('returns empty array on DB error', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.getSpaceMembers('space-1');

      expect(result).toEqual([]);
    });

    it('falls back to email prefix when name is null', async () => {
      const rawMembers = [
        { user_id: 'user-1', users: { email: 'alice@test.com', name: null } },
      ];
      const chain = createChainMock({ data: rawMembers, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.getSpaceMembers('space-1');

      expect(result[0].name).toBe('alice');
    });
  });

  // ── sendEmailNotification ────────────────────────────────────────────────
  describe('sendEmailNotification', () => {
    it('returns success when API call succeeds', async () => {
      mockCsrfFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await enhancedNotificationService.sendEmailNotification(
        'task_assignment',
        'user@test.com',
        'New Task',
        { taskTitle: 'Do dishes' }
      );

      expect(result.success).toBe(true);
    });

    it('returns failure on fetch error', async () => {
      mockCsrfFetch.mockRejectedValue(new Error('Network error'));

      const result = await enhancedNotificationService.sendEmailNotification(
        'task_assignment',
        'user@test.com',
        'New Task',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  // ── sendGoalAchievementNotification ──────────────────────────────────────
  describe('sendGoalAchievementNotification', () => {
    it('returns inApp count equal to number of valid users', async () => {
      const users = [
        { id: 'user-1', email: 'alice@test.com', name: 'Alice' },
        { id: 'user-2', email: 'bob@test.com', name: 'Bob' },
      ];
      const chain = createChainMock({ data: users, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendGoalAchievementNotification(
        ['user-1', 'user-2'],
        {
          achievementType: 'goal_completed',
          goalTitle: 'Save $1000',
          completedBy: 'Alice',
          completionDate: '2026-01-01',
          spaceName: 'The Smiths',
        }
      );

      expect(result.inApp).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('records error for missing users', async () => {
      const chain = createChainMock({ data: [], error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendGoalAchievementNotification(
        ['unknown-user'],
        {
          achievementType: 'goal_completed',
          goalTitle: 'Vacation',
          completedBy: 'Alice',
          completionDate: '2026-01-01',
          spaceName: 'Family',
        }
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns errors when users fetch fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendGoalAchievementNotification(
        ['user-1'],
        {
          achievementType: 'milestone_reached',
          goalTitle: 'Goal',
          completedBy: 'Alice',
          completionDate: '2026-01-01',
          spaceName: 'Family',
        }
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── sendTaskAssignmentNotification ────────────────────────────────────────
  describe('sendTaskAssignmentNotification', () => {
    it('returns inApp count for valid users', async () => {
      const users = [{ id: 'user-1', email: 'alice@test.com', name: 'Alice' }];
      const chain = createChainMock({ data: users, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendTaskAssignmentNotification(
        ['user-1'],
        {
          taskTitle: 'Clean kitchen',
          assignedBy: 'Bob',
          assignedTo: 'Alice',
          priority: 'medium',
          spaceName: 'Home',
        }
      );

      expect(result.inApp).toBe(1);
    });

    it('returns errors when users fetch fails', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendTaskAssignmentNotification(
        ['user-1'],
        {
          taskTitle: 'Task',
          assignedBy: 'Bob',
          assignedTo: 'Alice',
          priority: 'low',
          spaceName: 'Home',
        }
      );

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── sendEventReminderNotification ─────────────────────────────────────────
  describe('sendEventReminderNotification', () => {
    it('returns inApp count for valid users', async () => {
      const users = [{ id: 'user-1', email: 'alice@test.com', name: 'Alice' }];
      const chain = createChainMock({ data: users, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendEventReminderNotification(
        ['user-1'],
        {
          eventTitle: 'Team Meeting',
          startTime: '2026-01-01T10:00:00Z',
          reminderTime: '1hour',
          spaceName: 'Work',
        }
      );

      expect(result.inApp).toBe(1);
    });
  });

  // ── sendNewMessageNotification ────────────────────────────────────────────
  describe('sendNewMessageNotification', () => {
    it('returns inApp count for valid users', async () => {
      const users = [{ id: 'user-1', email: 'alice@test.com', name: 'Alice' }];
      const chain = createChainMock({ data: users, error: null });
      mockClient.from.mockReturnValue(chain);

      const result = await enhancedNotificationService.sendNewMessageNotification(
        ['user-1'],
        {
          senderName: 'Bob',
          messagePreview: 'Hello!',
          isDirectMessage: true,
          spaceName: 'Home',
        }
      );

      expect(result.inApp).toBe(1);
    });
  });
});
