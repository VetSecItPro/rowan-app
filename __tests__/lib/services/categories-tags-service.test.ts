import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as categoriesTagsService from '@/lib/services/categories-tags-service';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('categories-tags-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomCategories', () => {
    it('should fetch active custom categories', async () => {
      const mockCategories = [
        { id: 'cat-1', space_id: 'space-1', name: 'Work', color: '#blue', is_active: true },
        { id: 'cat-2', space_id: 'space-1', name: 'Personal', color: '#green', is_active: true },
      ];

      // Chain: .select().eq('space_id').order('name') then conditionally .eq('is_active', true)
      // Must use thenable pattern so `.eq()` can be called after `.order()`
      const query: Record<string, ReturnType<typeof vi.fn>> = {};
      const handler = () => query;
      query.select = vi.fn(handler);
      query.eq = vi.fn(handler);
      query.order = vi.fn(handler);
      query.then = vi.fn((resolve) => resolve({ data: mockCategories, error: null }));

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.getCustomCategories('space-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Work');
      expect(query.eq).toHaveBeenCalledWith('space_id', 'space-1');
      expect(query.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should include inactive categories when specified', async () => {
      const query: Record<string, ReturnType<typeof vi.fn>> = {};
      const handler = () => query;
      query.select = vi.fn(handler);
      query.eq = vi.fn(handler);
      query.order = vi.fn(handler);
      query.then = vi.fn((resolve) => resolve({ data: [], error: null }));

      mockSupabase.from.mockReturnValue(query);

      await categoriesTagsService.getCustomCategories('space-1', true);

      expect(query.eq).toHaveBeenCalledWith('space_id', 'space-1');
      // Should not filter by is_active when includeInactive is true
      expect(query.eq).not.toHaveBeenCalledWith('is_active', true);
    });

    it('should handle errors', async () => {
      const query: Record<string, ReturnType<typeof vi.fn>> = {};
      const handler = () => query;
      query.select = vi.fn(handler);
      query.eq = vi.fn(handler);
      query.order = vi.fn(handler);
      query.then = vi.fn((resolve) => resolve({ data: null, error: { message: 'DB error' } }));

      mockSupabase.from.mockReturnValue(query);

      await expect(categoriesTagsService.getCustomCategories('space-1')).rejects.toThrow();
    });
  });

  describe('createCustomCategory', () => {
    it('should create a new custom category', async () => {
      const input = {
        space_id: 'space-1',
        name: 'Shopping',
        description: 'Shopping expenses',
        color: '#purple',
        created_by: 'user-1',
      };

      const mockCategory = { id: 'cat-1', ...input, is_active: true };

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.createCustomCategory(input);

      expect(result.id).toBe('cat-1');
      expect(result.name).toBe('Shopping');
      expect(query.insert).toHaveBeenCalled();
    });

    it('should use default color if not provided', async () => {
      const input = {
        space_id: 'space-1',
        name: 'Shopping',
        created_by: 'user-1',
      };

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...input, color: '#6366f1' }, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.createCustomCategory(input);

      expect(query.insert).toHaveBeenCalledWith([expect.objectContaining({ color: '#6366f1' })]);
    });
  });

  describe('getTags', () => {
    it('should fetch all tags for a space', async () => {
      const mockTags = [
        { id: 'tag-1', space_id: 'space-1', name: 'urgent', color: '#red' },
        { id: 'tag-2', space_id: 'space-1', name: 'review', color: '#blue' },
      ];

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.getTags('space-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('urgent');
      expect(query.eq).toHaveBeenCalledWith('space_id', 'space-1');
    });
  });

  describe('createTag', () => {
    it('should create a new tag', async () => {
      const input = {
        space_id: 'space-1',
        name: 'important',
        color: '#yellow',
        created_by: 'user-1',
      };

      const mockTag = { id: 'tag-1', ...input };

      const query = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTag, error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.createTag(input);

      expect(result.id).toBe('tag-1');
      expect(result.name).toBe('important');
    });
  });

  describe('addTagToExpense', () => {
    it('should add a tag to an expense', async () => {
      const query = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(query);

      await categoriesTagsService.addTagToExpense('expense-1', 'tag-1');

      expect(query.insert).toHaveBeenCalledWith([{ expense_id: 'expense-1', tag_id: 'tag-1' }]);
    });

    it('should ignore duplicate tag assignments', async () => {
      const query = {
        insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      };

      mockSupabase.from.mockReturnValue(query);

      await expect(
        categoriesTagsService.addTagToExpense('expense-1', 'tag-1')
      ).resolves.not.toThrow();
    });
  });

  describe('removeTagFromExpense', () => {
    it('should remove a tag from an expense', async () => {
      const query = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Make the last .eq() in the chain resolve
      let eqCallCount = 0;
      query.eq = vi.fn(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return query;
      }) as any;

      mockSupabase.from.mockReturnValue(query);

      await categoriesTagsService.removeTagFromExpense('expense-1', 'tag-1');

      expect(query.delete).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('expense_id', 'expense-1');
      expect(query.eq).toHaveBeenCalledWith('tag_id', 'tag-1');
    });
  });

  describe('getExpenseStatsByCategory', () => {
    it('should calculate expense statistics by category', async () => {
      const mockExpenses = [
        { category: 'Food', amount: 100 },
        { category: 'Food', amount: 50 },
        { category: 'Transport', amount: 30 },
      ];

      // The actual code: supabase.from('expenses').select('category, amount').eq('space_id', spaceId)
      // No gte/lte when no dates are passed
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        // Make it thenable so await resolves
        then: vi.fn((resolve: (value: unknown) => void) => resolve({ data: mockExpenses, error: null })),
      };

      mockSupabase.from.mockReturnValue(query);

      const result = await categoriesTagsService.getExpenseStatsByCategory('space-1');

      expect(result).toHaveLength(2);
      const foodStats = result.find((s: { category: string }) => s.category === 'Food');
      expect(foodStats?.total).toBe(150);
      expect(foodStats?.count).toBe(2);
    });

    it('should filter by date range', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: (value: unknown) => void) => resolve({ data: [], error: null })),
      };

      mockSupabase.from.mockReturnValue(query);

      await categoriesTagsService.getExpenseStatsByCategory('space-1', '2024-01-01', '2024-12-31');

      expect(query.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(query.lte).toHaveBeenCalledWith('date', '2024-12-31');
    });
  });

  describe('searchByTags', () => {
    it('should search items by tag names', async () => {
      const mockTags = [{ id: 'tag-1' }, { id: 'tag-2' }];

      const tagsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockTags, error: null }),
      };

      const expensesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'tags') return tagsQuery;
        return expensesQuery;
      });

      const result = await categoriesTagsService.searchByTags('space-1', ['urgent', 'review']);

      expect(result.expenses).toBeDefined();
      expect(result.goals).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(tagsQuery.in).toHaveBeenCalledWith('name', ['urgent', 'review']);
    });
  });
});
