import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchExternalRecipes, searchByCuisine, getRandomRecipes, SUPPORTED_CUISINES } from '@/lib/services/external-recipes-service';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('external-recipes-service', () => {
  describe('searchExternalRecipes', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchExternalRecipes('');
      expect(results).toEqual([]);
    });

    it('should return empty array for very short query', async () => {
      const results = await searchExternalRecipes('a');
      expect(results).toEqual([]);
    });

    it('should search across all APIs and aggregate results', async () => {
      const mockRecipe = {
        id: 'test-1',
        source: 'themealdb' as const,
        name: 'Test Recipe',
        ingredients: [{ name: 'flour', amount: '2', unit: 'cups' }],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => [mockRecipe],
      });

      const results = await searchExternalRecipes('pasta');

      expect(results.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should deduplicate results by id', async () => {
      const mockRecipes = [
        { id: 'recipe-1', source: 'themealdb' as const, name: 'Recipe 1', ingredients: [] },
        { id: 'recipe-1', source: 'spoonacular' as const, name: 'Recipe 1', ingredients: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const results = await searchExternalRecipes('test');

      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle API failures gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await searchExternalRecipes('pasta');

      expect(results).toEqual([]);
    });

    it('should sort results by source priority', async () => {
      const mockRecipes = [
        { id: 'recipe-1', source: 'apininjas' as const, name: 'Recipe 1', ingredients: [] },
        { id: 'recipe-2', source: 'themealdb' as const, name: 'Recipe 2', ingredients: [] },
        { id: 'recipe-3', source: 'spoonacular' as const, name: 'Recipe 3', ingredients: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const results = await searchExternalRecipes('test');

      if (results.length > 1) {
        expect(results[0].source).not.toBe('apininjas');
      }
    });
  });

  describe('searchByCuisine', () => {
    it('should search recipes by cuisine', async () => {
      const mockRecipes = [
        { id: 'italian-1', source: 'themealdb' as const, name: 'Pasta', cuisine: 'Italian', ingredients: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const results = await searchByCuisine('Italian');

      expect(global.fetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const results = await searchByCuisine('Italian');

      expect(results).toEqual([]);
    });

    it('should deduplicate cuisine search results', async () => {
      const mockRecipes = [
        { id: 'recipe-1', source: 'themealdb' as const, name: 'Recipe 1', ingredients: [] },
        { id: 'recipe-1', source: 'spoonacular' as const, name: 'Recipe 1', ingredients: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const results = await searchByCuisine('Italian');

      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getRandomRecipes', () => {
    it('should fetch random recipes', async () => {
      const mockRecipes = [
        { id: 'random-1', source: 'themealdb' as const, name: 'Random Recipe', ingredients: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockRecipes,
      });

      const results = await getRandomRecipes(5);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/recipes/external/random?count=5'));
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await getRandomRecipes();

      expect(results).toEqual([]);
    });

    it('should use default count of 10', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await getRandomRecipes();

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('count=10'));
    });
  });

  describe('SUPPORTED_CUISINES', () => {
    it('should export a list of supported cuisines', () => {
      expect(SUPPORTED_CUISINES).toBeDefined();
      expect(Array.isArray(SUPPORTED_CUISINES)).toBe(true);
      expect(SUPPORTED_CUISINES.length).toBeGreaterThan(0);
    });

    it('should have proper structure for each cuisine', () => {
      const cuisine = SUPPORTED_CUISINES[0];
      expect(cuisine).toHaveProperty('value');
      expect(cuisine).toHaveProperty('label');
      expect(cuisine).toHaveProperty('flag');
    });
  });
});
