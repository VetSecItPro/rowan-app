import { describe, it, expect, vi, beforeEach } from 'vitest';
import { personalWorkspaceService } from '@/lib/services/personal-workspace-service';

// Use vi.hoisted for mock objects referenced in vi.mock
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('personal-workspace-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('getPersonalSpace', () => {
    it('should return personal space when it exists', async () => {
      const mockSpace = {
        id: 'space-1',
        name: "John's Personal Workspace",
        user_id: 'user-1',
        is_personal: true,
        auto_created: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      // getPersonalSpace: .from('spaces').select(...).eq('user_id', userId).eq('is_personal', true).single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockSpace, error: null });

      const result = await personalWorkspaceService.getPersonalSpace('user-1');

      expect(result).toEqual(mockSpace);
      expect(mockSupabase.from).toHaveBeenCalledWith('spaces');
    });

    it('should return null when no personal space exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await personalWorkspaceService.getPersonalSpace('user-1');
      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Internal error' },
      });

      const result = await personalWorkspaceService.getPersonalSpace('user-1');
      expect(result).toBeNull();
    });
  });

  describe('hasPersonalSpace', () => {
    it('should return true when personal space exists', async () => {
      const mockSpace = {
        id: 'space-1',
        name: "John's Personal Workspace",
        user_id: 'user-1',
        is_personal: true,
      };
      mockSupabase.single.mockResolvedValueOnce({ data: mockSpace, error: null });

      const result = await personalWorkspaceService.hasPersonalSpace('user-1');
      expect(result).toBe(true);
    });

    it('should return false when no personal space exists', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await personalWorkspaceService.hasPersonalSpace('user-1');
      expect(result).toBe(false);
    });
  });

  describe('createPersonalSpace', () => {
    it('should create a new personal space', async () => {
      const mockNewSpace = {
        id: 'space-1',
        name: "John's Personal Workspace",
        user_id: 'user-1',
        is_personal: true,
        auto_created: true,
      };

      // 1. getPersonalSpace returns null (no existing space) - PGRST116
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // 2. insert().select().single() returns new space
      mockSupabase.single.mockResolvedValueOnce({ data: mockNewSpace, error: null });

      // 3. insert for space_members - use separate insert chain
      // The second insert call should resolve with { error: null }
      // First insert (space creation) returns chainable via default
      // Second insert (member creation) needs to resolve directly
      mockSupabase.insert
        .mockReturnValueOnce(mockSupabase) // first insert (space) returns chainable
        .mockResolvedValueOnce({ error: null }); // second insert (member) resolves

      const result = await personalWorkspaceService.createPersonalSpace('user-1', 'John');
      expect(result).toEqual(mockNewSpace);
    });

    it('should return existing space if already exists', async () => {
      const mockExistingSpace = {
        id: 'space-1',
        name: "John's Personal Workspace",
        user_id: 'user-1',
        is_personal: true,
      };

      // getPersonalSpace returns existing space
      mockSupabase.single.mockResolvedValueOnce({ data: mockExistingSpace, error: null });

      const result = await personalWorkspaceService.createPersonalSpace('user-1', 'John');
      expect(result).toEqual(mockExistingSpace);
    });

    it('should throw error on database failure', async () => {
      // getPersonalSpace returns null
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // insert().select().single() returns error
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      });

      await expect(
        personalWorkspaceService.createPersonalSpace('user-1', 'John')
      ).rejects.toThrow('Failed to create personal workspace');
    });
  });

  describe('isPersonalSpace', () => {
    it('should return true for personal space', async () => {
      // .from('spaces').select('is_personal').eq('id', spaceId).single()
      mockSupabase.single.mockResolvedValueOnce({
        data: { is_personal: true },
        error: null,
      });

      const result = await personalWorkspaceService.isPersonalSpace('space-1');
      expect(result).toBe(true);
    });

    it('should return false for non-personal space', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { is_personal: false },
        error: null,
      });

      const result = await personalWorkspaceService.isPersonalSpace('space-1');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found'),
      });

      const result = await personalWorkspaceService.isPersonalSpace('space-1');
      expect(result).toBe(false);
    });
  });

  describe('deletePersonalSpace', () => {
    it('should delete personal space successfully', async () => {
      const mockSpace = { id: 'space-1', user_id: 'user-1', is_personal: true };

      // 1. getPersonalSpace returns the space
      mockSupabase.single.mockResolvedValueOnce({ data: mockSpace, error: null });

      // 2. delete().eq('id').eq('user_id').eq('is_personal') resolves
      // Use a separate delete chain to avoid eq.mockResolvedValueOnce consuming getPersonalSpace's eq
      mockSupabase.delete.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await personalWorkspaceService.deletePersonalSpace('user-1');
      expect(result).toBe(true);
    });

    it('should return true if space does not exist', async () => {
      // getPersonalSpace returns null
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await personalWorkspaceService.deletePersonalSpace('user-1');
      expect(result).toBe(true);
    });

    it('should return false if trying to delete non-personal space', async () => {
      // getPersonalSpace uses .eq('is_personal', true) so it will only return personal spaces
      // But if the returned space has is_personal = false (shouldn't normally happen),
      // the service throws. However, getPersonalSpace queries with .eq('is_personal', true)
      // so the DB would never return a non-personal space.
      // The safety check in deletePersonalSpace checks personalSpace.is_personal.
      // Since getPersonalSpace only queries is_personal=true spaces, this is a defense-in-depth check.
      // To trigger it, we need the mock to return a space with is_personal=false:
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'space-1', user_id: 'user-1', is_personal: false },
        error: null,
      });

      const result = await personalWorkspaceService.deletePersonalSpace('user-1');
      // The service throws "Attempted to delete non-personal space" which is caught and returns false
      expect(result).toBe(false);
    });
  });

  describe('getMigrationHistory', () => {
    it('should return empty array when no migrations exist', async () => {
      // .from('workspace_migrations').select(...).eq('user_id', userId).order(...)
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await personalWorkspaceService.getMigrationHistory('user-1');
      expect(result).toEqual([]);
    });

    it('should return migration history', async () => {
      const mockMigrations = [
        {
          id: 'migration-1',
          user_id: 'user-1',
          from_space_id: 'space-1',
          to_space_id: 'space-2',
          item_type: 'task',
          item_id: 'task-1',
          migrated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: mockMigrations, error: null });

      const result = await personalWorkspaceService.getMigrationHistory('user-1');
      expect(result).toEqual(mockMigrations);
    });
  });
});
