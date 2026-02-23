import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shoppingService } from '@/lib/services/shopping-service';

// Mock Supabase client using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

describe('shopping-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLists', () => {
    it('should fetch shopping lists for a space', async () => {
      const mockLists = [{
        id: 'list-1',
        space_id: 'space-123',
        title: 'Groceries',
        status: 'active',
        items: [],
      }];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockLists,
          error: null,
        }),
      });

      const result = await shoppingService.getLists('space-123');
      expect(result).toEqual(mockLists);
    });

    it('should throw on database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      await expect(shoppingService.getLists('space-123')).rejects.toThrow();
    });
  });

  describe('getListById', () => {
    it('should fetch a single list with items', async () => {
      const mockList = {
        id: 'list-1',
        space_id: 'space-123',
        title: 'Weekly Groceries',
        items: [
          { id: 'item-1', name: 'Milk', checked: false },
          { id: 'item-2', name: 'Bread', checked: true },
        ],
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockList,
          error: null,
        }),
      });

      const result = await shoppingService.getListById('list-1');
      expect(result?.items).toHaveLength(2);
    });
  });
});
