import { describe, it, expect, vi, beforeEach } from 'vitest';
import { householdBalanceService } from '@/lib/services/household-balance-service';
import type { SpaceMemberInfo } from '@/lib/services/household-balance-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('household-balance-service', () => {
  const mockMembers: SpaceMemberInfo[] = [
    { id: 'user-1', name: 'Alice', avatar: 'avatar1.jpg', color: 'blue', isCurrentUser: true },
    { id: 'user-2', name: 'Bob', avatar: 'avatar2.jpg', color: 'green', isCurrentUser: false },
    { id: 'user-3', name: 'Charlie', avatar: 'avatar3.jpg', color: 'purple', isCurrentUser: false },
  ];

  describe('getBalance', () => {
    it('should compute balanced household contributions', async () => {
      const mockTasks = [
        { id: 'task-1', assigned_to: 'user-1', completed_at: '2026-02-20T10:00:00Z' },
        { id: 'task-2', assigned_to: 'user-2', completed_at: '2026-02-20T11:00:00Z' },
        { id: 'task-3', assigned_to: 'user-3', completed_at: '2026-02-20T12:00:00Z' },
      ];

      const mockChores = [
        { id: 'chore-1', assigned_to: 'user-1', completed_at: '2026-02-20T10:00:00Z', point_value: 10 },
        { id: 'chore-2', assigned_to: 'user-2', completed_at: '2026-02-20T11:00:00Z', point_value: 15 },
        { id: 'chore-3', assigned_to: 'user-3', completed_at: '2026-02-20T12:00:00Z', point_value: 20 },
      ];

      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockChores, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'week');

      expect(result.totalCompletions).toBe(6);
      expect(result.balanceScore).toBeGreaterThan(90);
      expect(result.balanceStatus).toBe('balanced');
      expect(result.members).toHaveLength(3);
      expect(result.members[0].totalCompleted).toBe(2);
      expect(result.members[0].pointsEarned).toBe(10);
    });

    it('should compute unbalanced household contributions', async () => {
      const mockTasks = [
        { id: 'task-1', assigned_to: 'user-1', completed_at: '2026-02-20T10:00:00Z' },
        { id: 'task-2', assigned_to: 'user-1', completed_at: '2026-02-20T11:00:00Z' },
        { id: 'task-3', assigned_to: 'user-1', completed_at: '2026-02-20T12:00:00Z' },
        { id: 'task-4', assigned_to: 'user-1', completed_at: '2026-02-20T13:00:00Z' },
      ];

      const mockChores = [
        { id: 'chore-1', assigned_to: 'user-1', completed_at: '2026-02-20T10:00:00Z', point_value: 10 },
        { id: 'chore-2', assigned_to: 'user-2', completed_at: '2026-02-20T11:00:00Z', point_value: 5 },
      ];

      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockChores, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'week');

      expect(result.totalCompletions).toBe(6);
      expect(result.balanceScore).toBeLessThan(75);
      expect(result.balanceStatus).toMatch(/uneven|slightly-uneven/);
      expect(result.members[0].totalCompleted).toBe(5);
      expect(result.members[1].totalCompleted).toBe(1);
      expect(result.members[2].totalCompleted).toBe(0);
    });

    it('should handle zero completions', async () => {
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'month');

      expect(result.totalCompletions).toBe(0);
      expect(result.balanceScore).toBe(100);
      expect(result.balanceStatus).toBe('balanced');
      expect(result.members.every((m) => m.totalCompleted === 0)).toBe(true);
    });

    it('should sort members by total completed descending', async () => {
      const mockTasks = [
        { id: 'task-1', assigned_to: 'user-2', completed_at: '2026-02-20T10:00:00Z' },
        { id: 'task-2', assigned_to: 'user-2', completed_at: '2026-02-20T11:00:00Z' },
        { id: 'task-3', assigned_to: 'user-2', completed_at: '2026-02-20T12:00:00Z' },
        { id: 'task-4', assigned_to: 'user-1', completed_at: '2026-02-20T13:00:00Z' },
      ];

      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'week');

      expect(result.members[0].memberId).toBe('user-2');
      expect(result.members[0].totalCompleted).toBe(3);
      expect(result.members[1].memberId).toBe('user-1');
      expect(result.members[1].totalCompleted).toBe(1);
      expect(result.members[2].totalCompleted).toBe(0);
    });

    it('should handle database errors', async () => {
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };

      mockSupabase.from.mockReturnValue(mockTasksQuery);

      await expect(householdBalanceService.getBalance('space-1', mockMembers, 'week')).rejects.toThrow();
    });

    it('should use correct timeframe for week', async () => {
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'week');

      expect(result.timeframe).toBe('week');
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should use correct timeframe for month', async () => {
      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'month');

      expect(result.timeframe).toBe('month');
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should calculate correct percentages', async () => {
      const mockTasks = [
        { id: 'task-1', assigned_to: 'user-1', completed_at: '2026-02-20T10:00:00Z' },
        { id: 'task-2', assigned_to: 'user-1', completed_at: '2026-02-20T11:00:00Z' },
        { id: 'task-3', assigned_to: 'user-2', completed_at: '2026-02-20T12:00:00Z' },
      ];

      const mockTasksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      };

      const mockChoresQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockTasksQuery)
        .mockReturnValueOnce(mockChoresQuery);

      const result = await householdBalanceService.getBalance('space-1', mockMembers, 'week');

      const user1Contribution = result.members.find((m) => m.memberId === 'user-1');
      expect(user1Contribution?.percentage).toBe(67);

      const user2Contribution = result.members.find((m) => m.memberId === 'user-2');
      expect(user2Contribution?.percentage).toBe(33);
    });
  });
});
