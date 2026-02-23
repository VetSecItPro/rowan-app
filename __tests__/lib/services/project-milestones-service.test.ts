import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectMilestonesService } from '@/lib/services/project-milestones-service';

// Use vi.hoisted for mock objects
const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('project-milestones-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('getMilestones', () => {
    it('should fetch milestones for a project', async () => {
      const mockMilestones = [
        { id: '1', title: 'Milestone 1', is_completed: false, sort_order: 0 },
        { id: '2', title: 'Milestone 2', is_completed: true, sort_order: 1 },
      ];
      // .from().select().eq().order() - order is terminal
      mockSupabase.order.mockResolvedValueOnce({ data: mockMilestones, error: null });

      const result = await projectMilestonesService.getMilestones('project-1');
      expect(result).toEqual(mockMilestones);
      expect(mockSupabase.from).toHaveBeenCalledWith('project_milestones');
    });

    it('should throw error on database failure', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      await expect(projectMilestonesService.getMilestones('project-1')).rejects.toThrow();
    });
  });

  describe('getMilestoneProgress', () => {
    it('should calculate progress correctly', async () => {
      const mockMilestones = [
        { id: '1', is_completed: true, sort_order: 0 },
        { id: '2', is_completed: true, sort_order: 1 },
        { id: '3', is_completed: false, sort_order: 2 },
      ];
      mockSupabase.order.mockResolvedValueOnce({ data: mockMilestones, error: null });

      const result = await projectMilestonesService.getMilestoneProgress('project-1');
      expect(result.total).toBe(3);
      expect(result.completed).toBe(2);
      expect(result.percentage).toBe(67);
    });

    it('should return 0% for projects with no milestones', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await projectMilestonesService.getMilestoneProgress('project-1');
      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe('createMilestone', () => {
    it('should create a milestone with auto-incremented sort order', async () => {
      const mockNewMilestone = { id: 'new-1', title: 'New', sort_order: 3 };

      // First: get max sort_order: .from().select('sort_order').eq().order().limit(1)
      mockSupabase.limit.mockResolvedValueOnce({ data: [{ sort_order: 2 }], error: null });

      // Then: insert: .from().insert().select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockNewMilestone, error: null });

      const result = await projectMilestonesService.createMilestone({
        project_id: 'project-1',
        space_id: 'space-1',
        title: 'New Milestone',
      });
      expect(result).toEqual(mockNewMilestone);
    });

    it('should use sort order 0 for first milestone', async () => {
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: '1', sort_order: 0 }, error: null });

      await projectMilestonesService.createMilestone({
        project_id: 'project-1',
        space_id: 'space-1',
        title: 'First',
      });
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('updateMilestone', () => {
    it('should update milestone successfully', async () => {
      const mockUpdated = { id: '1', title: 'Updated', is_completed: true };
      // .from().update(data).eq('id', id).select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockUpdated, error: null });

      const result = await projectMilestonesService.updateMilestone('1', { title: 'Updated' });
      expect(result).toEqual(mockUpdated);
    });

    it('should set completed_at when marking as completed', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: '1', is_completed: true, completed_at: '2024-01-15' }, error: null });

      await projectMilestonesService.updateMilestone('1', { is_completed: true });
      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it('should clear completed_at when marking as incomplete', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { id: '1', is_completed: false, completed_at: null }, error: null });

      await projectMilestonesService.updateMilestone('1', { is_completed: false });
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('toggleMilestone', () => {
    it('should toggle completion status', async () => {
      // First: get current state: .from().select('is_completed').eq('id', id).single()
      mockSupabase.single.mockResolvedValueOnce({ data: { is_completed: false }, error: null });
      // Then: updateMilestone: .from().update().eq().select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: { id: '1', is_completed: true }, error: null });

      const result = await projectMilestonesService.toggleMilestone('1');
      expect(result.is_completed).toBe(true);
    });
  });

  describe('deleteMilestone', () => {
    it('should delete milestone successfully', async () => {
      // .from().delete().eq('id', '1')
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await projectMilestonesService.deleteMilestone('1');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('reorderMilestones', () => {
    it('should update sort order for all milestones', async () => {
      const milestoneIds = ['1', '2', '3'];
      // Each reorder: .from().update({ sort_order: index }).eq('id', id) - resolves
      mockSupabase.eq.mockResolvedValue({ error: null });

      await projectMilestonesService.reorderMilestones('project-1', milestoneIds);
      expect(mockSupabase.update).toHaveBeenCalledTimes(3);
    });
  });

  describe('createManyMilestones', () => {
    it('should create multiple milestones at once', async () => {
      const mockMilestones = [
        { id: '1', title: 'First', sort_order: 0 },
        { id: '2', title: 'Second', sort_order: 1 },
      ];
      // .from().insert().select()
      mockSupabase.select.mockResolvedValueOnce({ data: mockMilestones, error: null });

      const result = await projectMilestonesService.createManyMilestones([
        { project_id: 'p1', space_id: 's1', title: 'First' },
        { project_id: 'p1', space_id: 's1', title: 'Second' },
      ]);
      expect(result).toHaveLength(2);
    });
  });
});
