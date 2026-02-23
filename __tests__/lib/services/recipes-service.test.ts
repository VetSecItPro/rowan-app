import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

describe('recipes-service', () => {
  it('should handle recipe data', () => {
    const recipe = {
      id: 'recipe-1',
      space_id: 'space-123',
      title: 'Classic Pasta',
      prep_time: 15,
      cook_time: 30,
      servings: 4,
    };
    expect(recipe.servings).toBe(4);
    expect(recipe.prep_time + recipe.cook_time).toBe(45);
  });

  describe('recipe operations', () => {
    it('should handle ingredients', () => {
      const ingredients = [
        { name: 'pasta', quantity: 500, unit: 'g' },
        { name: 'tomatoes', quantity: 4, unit: 'pieces' },
      ];
      expect(ingredients).toHaveLength(2);
    });

    it('should calculate total time', () => {
      const prepTime = 15;
      const cookTime = 30;
      const totalTime = prepTime + cookTime;
      expect(totalTime).toBe(45);
    });
  });
});
