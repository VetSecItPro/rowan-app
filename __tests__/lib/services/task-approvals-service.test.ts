import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskApprovalsService } from '@/lib/services/task-approvals-service';

const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('taskApprovalsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestApproval', () => {
    it('should create approval request', async () => {
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'approval1', task_id: 'task1', status: 'pending' },
        error: null,
      });

      const result = await taskApprovalsService.requestApproval('task1', 'approver1', 'user1');

      expect(result.id).toBe('approval1');
      expect(result.status).toBe('pending');
    });

    it('should throw error on failure', async () => {
      mockSupabaseClient.insert.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') });

      await expect(taskApprovalsService.requestApproval('task1', 'approver1', 'user1')).rejects.toThrow();
    });
  });

  describe('getApprovals', () => {
    it('should return approvals for task', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ id: 'approval1', task_id: 'task1' }],
        error: null,
      });

      const result = await taskApprovalsService.getApprovals('task1');

      expect(result).toHaveLength(1);
      expect(result[0].task_id).toBe('task1');
    });
  });

  describe('updateApprovalStatus', () => {
    it('should update approval status', async () => {
      mockSupabaseClient.update.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'approval1', status: 'approved' },
        error: null,
      });

      const result = await taskApprovalsService.updateApprovalStatus('approval1', 'approved', 'Looks good');

      expect(result.status).toBe('approved');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for user', async () => {
      mockSupabaseClient.select.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockReturnValueOnce(mockSupabaseClient);
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ id: 'approval1', status: 'pending' }],
        error: null,
      });

      const result = await taskApprovalsService.getPendingApprovals('user1');

      expect(result).toBeInstanceOf(Array);
    });
  });
});
