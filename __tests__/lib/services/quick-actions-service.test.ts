import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quickActionsService } from '@/lib/services/quick-actions-service';

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

const mockSupabaseClient = {
  from: mockFrom,
  rpc: mockRpc,
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('quick-actions-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert, select: mockSelect });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: vi.fn().mockReturnValue({ order: mockOrder }) });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  describe('trackAction', () => {
    it('should track action successfully', async () => {
      await quickActionsService.trackAction('space-1', 'user-1', 'create_task');

      expect(mockFrom).toHaveBeenCalledWith('quick_action_usage');
      expect(mockInsert).toHaveBeenCalledWith({
        space_id: 'space-1',
        user_id: 'user-1',
        action_type: 'create_task',
        context: undefined,
      });
    });

    it('should track action with context', async () => {
      await quickActionsService.trackAction('space-1', 'user-1', 'create_task', 'from_dashboard');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'from_dashboard',
        })
      );
    });
  });

  describe('getTopActions', () => {
    it('should get top 5 actions by default', async () => {
      const mockActions = [
        { action_type: 'create_task', usage_count: 10 },
        { action_type: 'create_reminder', usage_count: 8 },
      ];
      mockLimit.mockResolvedValue({ data: mockActions, error: null });

      const result = await quickActionsService.getTopActions('space-1', 'user-1');

      expect(result).toEqual(mockActions);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should respect custom limit', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      await quickActionsService.getTopActions('space-1', 'user-1', 10);

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should throw error on database failure', async () => {
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(quickActionsService.getTopActions('space-1', 'user-1')).rejects.toThrow();
    });
  });

  describe('refreshStats', () => {
    it('should call refresh RPC function', async () => {
      await quickActionsService.refreshStats();

      expect(mockRpc).toHaveBeenCalledWith('refresh_quick_action_stats');
    });
  });

  describe('cleanupOldUsage', () => {
    it('should call cleanup RPC function', async () => {
      await quickActionsService.cleanupOldUsage();

      expect(mockRpc).toHaveBeenCalledWith('cleanup_old_quick_action_usage');
    });
  });
});
