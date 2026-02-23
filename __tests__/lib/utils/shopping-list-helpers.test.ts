/**
 * Unit tests for lib/utils/shopping-list-helpers.ts
 *
 * Tests createShoppingListFromRecipe: list creation, ingredient parsing
 * (both string and object formats), item insertion, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — variables must be created with vi.hoisted so they are
// available when the vi.mock factory is evaluated (factories are hoisted
// above all imports by Vitest's transform).
// ---------------------------------------------------------------------------

const { mockCreateList, mockCreateItem } = vi.hoisted(() => {
  const mockCreateList = vi.fn();
  const mockCreateItem = vi.fn();
  return { mockCreateList, mockCreateItem };
});

vi.mock('@/lib/services/shopping-service', () => ({
  shoppingService: {
    createList: mockCreateList,
    createItem: mockCreateItem,
  },
}));

vi.mock('@/lib/services/ingredient-parser', () => ({
  parseIngredient: vi.fn((text: string, recipeId: string, recipeName: string) => ({
    name: text.replace(/^\d+\s*\w*\s*/, '').trim() || text,
    amount: parseFloat(text) || 1,
    unit: '',
    originalText: text,
    recipeId,
    recipeName,
  })),
  categorizeIngredient: vi.fn(() => 'produce'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '02/22/2026'),
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------

import { createShoppingListFromRecipe } from '@/lib/utils/shopping-list-helpers';
import { parseIngredient, categorizeIngredient } from '@/lib/services/ingredient-parser';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SPACE_ID = 'space-abc';
const SCHEDULED_DATE = '2026-02-22';

function makeRecipe(overrides: Partial<{
  id: string;
  name: string;
  ingredients: unknown[];
}> = {}) {
  return {
    id: 'recipe-1',
    name: 'Pasta Carbonara',
    ingredients: ['2 eggs', '100g pancetta', '50g parmesan'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createShoppingListFromRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateList.mockResolvedValue({ id: 'list-xyz', title: 'test', space_id: SPACE_ID });
    mockCreateItem.mockResolvedValue({ id: 'item-1' });
  });

  // --- List creation ---

  it('should create a shopping list with a title combining recipe name and date', async () => {
    await createShoppingListFromRecipe(makeRecipe() as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateList).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Pasta Carbonara - 02/22/2026',
        space_id: SPACE_ID,
      })
    );
  });

  it('should set the list status to "active"', async () => {
    await createShoppingListFromRecipe(makeRecipe() as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateList).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });

  it('should include the recipe name in the list description', async () => {
    await createShoppingListFromRecipe(makeRecipe() as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateList).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('Pasta Carbonara') })
    );
  });

  it('should return the created list ID', async () => {
    const result = await createShoppingListFromRecipe(makeRecipe() as never, SPACE_ID, SCHEDULED_DATE);
    expect(result).toBe('list-xyz');
  });

  // --- String ingredient format ---

  it('should call parseIngredient for each string ingredient', async () => {
    const recipe = makeRecipe({ ingredients: ['2 eggs', '100g pancetta'] });
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(parseIngredient).toHaveBeenCalledTimes(2);
    expect(parseIngredient).toHaveBeenCalledWith('2 eggs', 'recipe-1', 'Pasta Carbonara');
  });

  it('should call createItem for each string ingredient', async () => {
    const recipe = makeRecipe({ ingredients: ['2 eggs', '100g pancetta', '50g parmesan'] });
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).toHaveBeenCalledTimes(3);
  });

  it('should pass the correct list_id to each createItem call', async () => {
    const recipe = makeRecipe({ ingredients: ['1 onion'] });
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({ list_id: 'list-xyz' })
    );
  });

  // --- Object ingredient format ---

  it('should handle object ingredients with name, amount, and unit fields', async () => {
    const recipe = makeRecipe({
      ingredients: [
        { name: 'chicken breast', amount: 2, unit: 'lbs' },
        { name: 'garlic', amount: '3', unit: 'cloves' },
      ],
    });

    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).toHaveBeenCalledTimes(2);
    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'chicken breast', quantity: 2, unit: 'lbs' })
    );
  });

  it('should parse string amounts from object ingredients (Math.round)', async () => {
    const recipe = makeRecipe({
      ingredients: [{ name: 'flour', amount: '2.5', unit: 'cups' }],
    });

    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    // Math.round(2.5) = 3
    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 })
    );
  });

  it('should default amount to 1 when object ingredient has no amount field', async () => {
    const recipe = makeRecipe({
      ingredients: [{ name: 'salt', unit: 'pinch' }],
    });

    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'salt', quantity: 1 })
    );
  });

  it('should call categorizeIngredient with the parsed ingredient name', async () => {
    const recipe = makeRecipe({ ingredients: ['2 eggs'] });
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(categorizeIngredient).toHaveBeenCalled();
  });

  // --- Edge cases ---

  it('should not call createItem when ingredient list is empty', async () => {
    const recipe = makeRecipe({ ingredients: [] });
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('should not call createItem when ingredients is undefined', async () => {
    const recipe = { id: 'recipe-1', name: 'Bare Recipe' };
    await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('should throw and propagate errors from createList', async () => {
    mockCreateList.mockRejectedValue(new Error('DB write failed'));

    await expect(
      createShoppingListFromRecipe(makeRecipe() as never, SPACE_ID, SCHEDULED_DATE)
    ).rejects.toThrow('DB write failed');
  });

  it('should throw and propagate errors from createItem', async () => {
    mockCreateItem.mockRejectedValue(new Error('Item insert failed'));

    await expect(
      createShoppingListFromRecipe(makeRecipe({ ingredients: ['1 egg'] }) as never, SPACE_ID, SCHEDULED_DATE)
    ).rejects.toThrow('Item insert failed');
  });

  it('should handle a single string ingredient correctly', async () => {
    const recipe = makeRecipe({ ingredients: ['500g pasta'] });
    const result = await createShoppingListFromRecipe(recipe as never, SPACE_ID, SCHEDULED_DATE);

    expect(result).toBe('list-xyz');
    expect(mockCreateItem).toHaveBeenCalledTimes(1);
  });
});
