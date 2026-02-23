import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getVendors,
  createLineItem,
} from '@/lib/services/project-tracking-service';

const mockSupabase = vi.hoisted(() => {
  const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
  chainable.from = vi.fn(() => chainable);
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
  chainable.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  return chainable;
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('@/lib/utils/input-sanitization', () => ({
  sanitizeSearchInput: vi.fn((s: string) => s),
}));

describe('project-tracking-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockResolvedValue({ data: [], error: null });
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('getProjects', () => {
    it('should fetch all projects for a space', async () => {
      const mockProjects = [{ id: '1', name: 'Kitchen Remodel', status: 'in-progress' }];
      // .from('projects').select(...).eq('space_id', spaceId).order(...)
      mockSupabase.order.mockResolvedValueOnce({ data: mockProjects, error: null });

      const result = await getProjects('space-1');
      expect(result).toEqual(mockProjects);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should throw on database error', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('DB error') });
      await expect(getProjects('space-1')).rejects.toThrow();
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const mockProject = { id: '1', name: 'New Project', space_id: 'space-1', created_by: 'user-1' };
      // .from('projects').insert([input]).select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });

      const result = await createProject({
        space_id: 'space-1',
        name: 'New Project',
        created_by: 'user-1',
      });
      expect(result).toEqual(mockProject);
    });
  });

  describe('updateProject', () => {
    it('should update project details', async () => {
      const mockUpdated = { id: '1', name: 'Updated Project' };
      // .from('projects').update(updates).eq('id', projectId).select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockUpdated, error: null });

      const result = await updateProject('1', { name: 'Updated Project' });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      // .from('projects').delete().eq('id', projectId)
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      await deleteProject('1');
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });

  describe('getVendors', () => {
    it('should fetch active vendors', async () => {
      const mockVendors = [{ id: '1', name: 'ABC Contractors', is_active: true }];
      // .from('vendors').select(...).eq('space_id', spaceId).eq('is_active', true).order(...)
      mockSupabase.order.mockResolvedValueOnce({ data: mockVendors, error: null });

      const result = await getVendors('space-1');
      expect(result).toEqual(mockVendors);
    });
  });

  describe('createLineItem', () => {
    it('should create a project line item', async () => {
      const mockLineItem = { id: '1', description: 'Labor', estimated_cost: 5000 };
      // .from('project_line_items').insert([input]).select().single()
      mockSupabase.single.mockResolvedValueOnce({ data: mockLineItem, error: null });

      const result = await createLineItem({
        project_id: 'p1',
        category: 'Labor',
        description: 'Installation',
        estimated_cost: 5000,
      });
      expect(result).toEqual(mockLineItem);
    });
  });
});
