import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserPresence,
  getSpaceMembersWithPresence,
  markUserOffline,
  getSpacePresenceSummary,
  cleanupInactiveUsers,
  isUserOnline,
} from '@/lib/services/presence-service';
import { PresenceStatus } from '@/lib/types';

// Use vi.hoisted for mock objects referenced in vi.mock
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.upsert = vi.fn(() => Promise.resolve({ error: null }));
  chainable.eq = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  chainable.rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
  chainable.auth = {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null })),
  };
  return chainable;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('presence-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setup
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.upsert.mockResolvedValue({ error: null });
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  describe('updateUserPresence', () => {
    it('should update user presence successfully', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await updateUserPresence('space-1', PresenceStatus.ONLINE);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_presence');
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should default to ONLINE status when not provided', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await updateUserPresence('space-1');
      expect(result.success).toBe(true);
    });

    it('should return error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const result = await updateUserPresence('space-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should return error on database failure', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: new Error('DB error') });

      const result = await updateUserPresence('space-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update presence');
    });

    it('should handle OFFLINE status', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      const result = await updateUserPresence('space-1', PresenceStatus.OFFLINE);
      expect(result.success).toBe(true);
    });
  });

  describe('getSpaceMembersWithPresence', () => {
    it('should return space members with presence data', async () => {
      const mockMembers = [
        {
          space_id: 'space-1',
          user_id: 'user-1',
          role: 'owner',
          name: 'John Doe',
          email: 'john@example.com',
          presence_status: 'online',
          last_activity: '2024-01-15T10:00:00Z',
        },
      ];

      // .from('space_members_with_presence').select(...).eq('space_id', spaceId)
      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      const result = await getSpaceMembersWithPresence('space-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('John Doe');
      }
    });

    it('should handle empty member list', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

      const result = await getSpaceMembersWithPresence('space-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should return error on database failure', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const result = await getSpaceMembersWithPresence('space-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to fetch space members');
      }
    });

    it('should handle members without presence data', async () => {
      const mockMembers = [
        {
          space_id: 'space-1',
          user_id: 'user-1',
          role: 'member',
          name: null,
          email: '',
          presence_status: null,
          last_activity: null,
        },
      ];

      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      const result = await getSpaceMembersWithPresence('space-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].name).toBe('Unknown User');
        expect(result.data[0].presence_status).toBe('offline');
      }
    });
  });

  describe('markUserOffline', () => {
    it('should mark user as offline', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: null });

      await markUserOffline('space-1');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_presence');
    });

    it('should not throw on error', async () => {
      mockSupabase.upsert.mockResolvedValue({ error: new Error('DB error') });

      await expect(markUserOffline('space-1')).resolves.not.toThrow();
    });
  });

  describe('getSpacePresenceSummary', () => {
    it('should return summary with member count and online count', async () => {
      const mockMembers = [
        {
          space_id: 'space-1',
          user_id: 'user-1',
          role: 'owner',
          name: 'John',
          presence_status: 'online',
        },
        {
          space_id: 'space-1',
          user_id: 'user-2',
          role: 'member',
          name: 'Jane',
          presence_status: 'offline',
        },
      ];

      mockSupabase.eq.mockResolvedValueOnce({ data: mockMembers, error: null });

      const result = await getSpacePresenceSummary('space-1');

      expect(result.total).toBe(2);
      expect(result.online).toBe(1);
      expect(result.members).toHaveLength(2);
    });

    it('should return zeros on error', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const result = await getSpacePresenceSummary('space-1');

      expect(result.total).toBe(0);
      expect(result.online).toBe(0);
      expect(result.members).toEqual([]);
    });
  });

  describe('cleanupInactiveUsers', () => {
    it('should call the database function successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await cleanupInactiveUsers();

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_inactive_users_offline');
    });

    it('should return error on database failure', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: new Error('DB error') });

      const result = await cleanupInactiveUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to cleanup inactive users');
    });
  });

  describe('isUserOnline', () => {
    it('should return true when user is online', async () => {
      // .from('user_presence').select('status').eq('user_id', userId).eq('status', 'online').limit(1)
      // eq is called twice, then limit resolves
      mockSupabase.limit.mockResolvedValueOnce({ data: [{ status: 'online' }], error: null });

      const result = await isUserOnline('user-1');
      expect(result).toBe(true);
    });

    it('should return false when user is offline', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

      const result = await isUserOnline('user-1');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: null, error: new Error('DB error') });

      const result = await isUserOnline('user-1');
      expect(result).toBe(false);
    });
  });
});
