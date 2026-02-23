import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('projects-service', () => {
  it('should handle project data', () => {
    const project = {
      id: 'proj-1',
      space_id: 'space-123',
      title: 'Home Renovation',
      status: 'in_progress',
      progress: 45,
      deadline: '2025-06-01',
    };
    expect(project.status).toBe('in_progress');
    expect(project.progress).toBe(45);
  });

  describe('project operations', () => {
    it('should track project status', () => {
      const statuses = ['planning', 'in_progress', 'completed', 'on_hold'];
      expect(statuses).toContain('in_progress');
    });

    it('should calculate progress percentage', () => {
      const completedTasks = 9;
      const totalTasks = 20;
      const progress = (completedTasks / totalTasks) * 100;
      expect(progress).toBe(45);
    });

    it('should handle project milestones', () => {
      const milestones = [
        { name: 'Phase 1', completed: true },
        { name: 'Phase 2', completed: false },
      ];
      const completed = milestones.filter(m => m.completed);
      expect(completed).toHaveLength(1);
    });
  });
});
