import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountDeletionService } from '@/lib/services/account-deletion-service';

// Use vi.hoisted for mock objects referenced in vi.mock
const mockSupabaseClient = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('accountDeletionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable - every method returns chainable by default
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.in.mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
  });

  describe('deleteUserAccount', () => {
    it('should successfully delete user account', async () => {
      const userId = 'user-123';

      // logDeletionAction: .from('account_deletion_audit_log').insert(...)
      // Already mocked: insert resolves { data: null, error: null }

      // Get space memberships: .from('space_members').select('space_id').eq('user_id', userId)
      // Need eq to resolve with membership data for this first call
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ space_id: 'space-1' }, { space_id: 'space-2' }],
        error: null,
      });

      // After that, all delete/in/eq calls resolve successfully (default)

      const result = await accountDeletionService.deleteUserAccount(userId, mockSupabaseClient as never);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('space_members');
    });

    it('should handle error when fetching memberships fails', async () => {
      const userId = 'user-123';

      // logDeletionAction insert succeeds (default)
      // Memberships query fails
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await accountDeletionService.deleteUserAccount(userId, mockSupabaseClient as never);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should delete data across all tables for user spaces', async () => {
      const userId = 'user-123';

      // Memberships query returns one space
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ space_id: 'space-1' }],
        error: null,
      });

      const result = await accountDeletionService.deleteUserAccount(userId, mockSupabaseClient as never);

      expect(result.success).toBe(true);
    });
  });

  describe('isAccountMarkedForDeletion', () => {
    it('should return true when account is marked for deletion', async () => {
      const userId = 'user-123';

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { user_id: userId },
        error: null,
      });

      const result = await accountDeletionService.isAccountMarkedForDeletion(userId, mockSupabaseClient as never);

      expect(result).toBe(true);
    });

    it('should return false when account is not marked for deletion', async () => {
      const userId = 'user-123';

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      const result = await accountDeletionService.isAccountMarkedForDeletion(userId, mockSupabaseClient as never);

      expect(result).toBe(false);
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should successfully cancel account deletion', async () => {
      const userId = 'user-123';

      // logDeletionAction: .from().insert() resolves ok (default)
      // cancelAccountDeletion: .from().delete().eq() resolves ok
      mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await accountDeletionService.cancelAccountDeletion(userId, mockSupabaseClient as never);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deleted_accounts');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it('should handle error when cancellation fails', async () => {
      const userId = 'user-123';

      // Make the delete().eq() call return an error
      // logDeletionAction calls from().insert() (no eq), then cancelAccountDeletion calls from().delete().eq()
      mockSupabaseClient.delete.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const result = await accountDeletionService.cancelAccountDeletion(userId, mockSupabaseClient as never);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('logDeletionAction', () => {
    it('should log deletion action successfully', async () => {
      const userId = 'user-123';
      const action = 'initiated';

      await accountDeletionService.logDeletionAction(userId, action, {}, mockSupabaseClient as never);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('account_deletion_audit_log');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should handle missing supabase client gracefully', async () => {
      const userId = 'user-123';
      const action = 'initiated';

      await accountDeletionService.logDeletionAction(userId, action, {});

      // Should not throw and should return early - from should not be called on the mock
      // (but the service calls logger.error, which is fine)
    });
  });
});
