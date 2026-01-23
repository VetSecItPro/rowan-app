import { shoppingService } from '@/lib/services/shopping-service';
import { Recipe } from '@/lib/services/meals-service';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import { parseIngredient, categorizeIngredient } from '@/lib/services/ingredient-parser';

/**
 * Creates a shopping list from a recipe's ingredients
 * @param recipe - The recipe with ingredients
 * @param spaceId - The space ID for the shopping list
 * @param scheduledDate - The meal date (for naming the list)
 * @returns The created shopping list ID
 */
export async function createShoppingListFromRecipe(
  recipe: Recipe,
  spaceId: string,
  scheduledDate: string
): Promise<string> {
  try {
    // Format the date for the list title
    const formattedDate = format(new Date(scheduledDate), 'MM/dd/yyyy');
    const listTitle = `${recipe.name} - ${formattedDate}`;

    // Create the shopping list
    const list = await shoppingService.createList({
      space_id: spaceId,
      title: listTitle,
      description: `Ingredients for ${recipe.name}`,
      status: 'active',
    });

    // Add each ingredient as a shopping item
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      await Promise.all(
        recipe.ingredients.map((ingredient) => {
          // Handle both string and object ingredient formats
          let parsed;
          if (typeof ingredient === 'string') {
            // Parse ingredient text to extract quantity, unit, and name
            parsed = parseIngredient(ingredient, recipe.id, recipe.name);
          } else {
            // Ingredient is already an object with name, amount, unit
            const amount = typeof ingredient.amount === 'string' ? parseFloat(ingredient.amount) || 1 : (ingredient.amount || 1);
            parsed = {
              name: ingredient.name,
              amount,
              unit: ingredient.unit || '',
              originalText: `${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim(),
              recipeId: recipe.id,
              recipeName: recipe.name,
            };
          }
          return shoppingService.createItem({
            list_id: list.id,
            name: parsed.name,
            quantity: Math.round(parsed.amount) || 1,
            unit: parsed.unit || undefined,
            category: categorizeIngredient(parsed.name),
          });
        })
      );
    }

    return list.id;
  } catch (error) {
    logger.error('Error creating shopping list from recipe:', error, { component: 'lib-shopping-list-helpers', action: 'service_call' });
    throw error;
  }
}
