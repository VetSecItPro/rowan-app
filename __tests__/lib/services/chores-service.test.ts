import { describe, it, expect, vi, beforeEach } from 'vitest';
import { choresService } from '@/lib/services/chores-service';
import type { Chore } from '@/lib/types';

// Mock Supabase client and services using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient, mockPointsService } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockCreateClient = vi.fn(() => mockSupabase);

  const mockPointsService = {
    awardChorePoints: vi.fn(),
  };

  return { mockSupabase, mockCreateClient, mockPointsService };
});

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/services/rewards', () => ({
  pointsService: mockPointsService,
}));

describe('chores-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getChores', () => {
    it('should fetch all chores for a space', async () => {
      const mockChores: Chore[] = [
        {
          id: 'chore-1',
          space_id: 'space-123',
          title: 'Clean Kitchen',
          frequency: 'daily',
          status: 'pending',
          created_by: 'user-123',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockChores,
          error: null,
        }),
      });

      const result = await choresService.getChores('space-123');

      expect(result).toEqual(mockChores);
      expect(mockSupabase.from).toHaveBeenCalledWith('chores');
    });

    it('should apply status filter', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqSpy,
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await choresService.getChores('space-123', { status: 'completed' });

      expect(eqSpy).toHaveBeenCalledWith('status', 'completed');
    });

    it('should apply frequency filter', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: eqSpy,
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await choresService.getChores('space-123', { frequency: 'weekly' });

      expect(eqSpy).toHaveBeenCalledWith('frequency', 'weekly');
    });

    it('should apply search filter', async () => {
      const orSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: orSpy,
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await choresService.getChores('space-123', { search: 'kitchen' });

      expect(orSpy).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(choresService.getChores('space-123')).rejects.toThrow('Failed to fetch chores');
    });
  });

  describe('getChoreById', () => {
    it('should fetch a single chore by ID', async () => {
      const mockChore: Chore = {
        id: 'chore-1',
        space_id: 'space-123',
        title: 'Clean Kitchen',
        frequency: 'daily',
        status: 'pending',
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockChore,
          error: null,
        }),
      });

      const result = await choresService.getChoreById('chore-1');

      expect(result).toEqual(mockChore);
    });

    it('should return null when chore not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      const result = await choresService.getChoreById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createChore', () => {
    it('should create a new chore', async () => {
      const newChore = {
        space_id: 'space-123',
        title: 'Vacuum Living Room',
        frequency: 'weekly' as const,
        created_by: 'user-123',
      };

      const createdChore: Chore = {
        ...newChore,
        id: 'chore-1',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: createdChore,
          error: null,
        }),
      });

      const result = await choresService.createChore(newChore);

      expect(result).toEqual(createdChore);
    });

    it('should throw error on creation failure', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      });

      await expect(
        choresService.createChore({
          space_id: 'space-123',
          title: 'Test Chore',
          frequency: 'daily',
          created_by: 'user-123',
        })
      ).rejects.toThrow('Failed to create chore');
    });
  });

  describe('updateChore', () => {
    it('should update a chore', async () => {
      const updates = { status: 'completed' as const };
      const updatedChore: Chore = {
        id: 'chore-1',
        space_id: 'space-123',
        title: 'Clean Kitchen',
        frequency: 'daily',
        status: 'completed',
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        completed_at: '2025-01-02T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedChore,
          error: null,
        }),
      });

      const result = await choresService.updateChore('chore-1', updates);

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeTruthy();
    });

    it('should set completed_at when marking as completed', async () => {
      const updateSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'chore-1',
            status: 'completed',
            completed_at: expect.any(String),
          },
          error: null,
        }),
      });

      await choresService.updateChore('chore-1', { status: 'completed' });

      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall.completed_at).toBeTruthy();
    });

    it('should clear completed_at when changing from completed', async () => {
      const updateSpy = vi.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'chore-1',
            status: 'pending',
            completed_at: null,
          },
          error: null,
        }),
      });

      await choresService.updateChore('chore-1', { status: 'pending' });

      const updateCall = updateSpy.mock.calls[0][0];
      expect(updateCall.completed_at).toBeNull();
    });
  });

  describe('deleteChore', () => {
    it('should delete a chore', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      await expect(choresService.deleteChore('chore-1')).resolves.not.toThrow();
    });

    it('should throw error on deletion failure', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Delete failed' },
        }),
      });

      await expect(choresService.deleteChore('chore-1')).rejects.toThrow('Failed to delete chore');
    });
  });

  describe('getChoreStats', () => {
    it('should return chore statistics', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
      });

      // Mock Promise.all results
      const selectSpy = vi.spyOn(mockSupabase, 'from');
      selectSpy.mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
              gte: vi.fn(() => Promise.resolve({ count: 5, error: null })),
              neq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
            })),
            neq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
          })),
          gte: vi.fn(() => Promise.resolve({ count: 8, error: null })),
        })),
      }));

      const stats = await choresService.getChoreStats('space-123', 'user-123');

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('completedThisWeek');
      expect(stats).toHaveProperty('myChores');
      expect(stats).toHaveProperty('partnerChores');
    });
  });

  describe('completeChoreWithRewards', () => {
    it('should complete chore and award points', async () => {
      const mockChore: Chore = {
        id: 'chore-1',
        space_id: 'space-123',
        title: 'Clean Kitchen',
        frequency: 'daily',
        status: 'pending',
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      // Mock getChoreById
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockChore,
          error: null,
        }),
      });

      // Mock updateChore
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockChore, status: 'completed', completed_at: new Date().toISOString() },
          error: null,
        }),
      });

      mockPointsService.awardChorePoints.mockResolvedValue({
        streakBonus: 5,
        newStreak: 3,
        transaction: { id: 'trans-1' },
      });

      const result = await choresService.completeChoreWithRewards('chore-1', 'user-123');

      expect(result.chore.status).toBe('completed');
      expect(result.pointsAwarded).toBeGreaterThan(0);
      expect(result.streakBonus).toBe(5);
      expect(result.newStreak).toBe(3);
    });

    it('should throw error when chore not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      });

      await expect(
        choresService.completeChoreWithRewards('nonexistent', 'user-123')
      ).rejects.toThrow('Chore not found');
    });

    it('should throw error when chore already completed', async () => {
      const completedChore: Chore = {
        id: 'chore-1',
        space_id: 'space-123',
        title: 'Clean Kitchen',
        frequency: 'daily',
        status: 'completed',
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        completed_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: completedChore,
          error: null,
        }),
      });

      await expect(
        choresService.completeChoreWithRewards('chore-1', 'user-123')
      ).rejects.toThrow('Chore is already completed');
    });
  });

  describe('uncompleteChore', () => {
    it('should revert a completed chore to pending', async () => {
      const mockChore: Chore = {
        id: 'chore-1',
        space_id: 'space-123',
        title: 'Clean Kitchen',
        frequency: 'daily',
        status: 'pending',
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockChore,
          error: null,
        }),
      });

      const result = await choresService.uncompleteChore('chore-1');

      expect(result.status).toBe('pending');
    });
  });

  describe('subscribeToChores', () => {
    it('should set up real-time subscription', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      mockSupabase.channel = vi.fn().mockReturnValue(mockChannel);

      const callback = vi.fn();
      choresService.subscribeToChores('space-123', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('chores:space-123');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });
});
