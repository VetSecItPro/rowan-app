/**
 * Ingredient Parser Service
 * Parses recipe ingredients and aggregates them for shopping lists
 */

export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  originalText: string;
  recipeId?: string;
  recipeName?: string;
}

export interface AggregatedIngredient {
  name: string;
  amount: number;
  unit: string;
  recipes: Array<{ id: string; name: string }>;
  notes?: string;
}

/**
 * Common unit conversions to standardize measurements
 */
const UNIT_CONVERSIONS: Record<string, string> = {
  // Volume
  'cup': 'cup',
  'cups': 'cup',
  'c': 'cup',
  'tablespoon': 'tbsp',
  'tablespoons': 'tbsp',
  'tbsp': 'tbsp',
  'tbs': 'tbsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'tsp': 'tsp',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'fl oz': 'fl oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'oz': 'oz',
  'pint': 'pint',
  'pints': 'pint',
  'quart': 'quart',
  'quarts': 'quart',
  'gallon': 'gallon',
  'gallons': 'gallon',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'ml': 'ml',
  'liter': 'L',
  'liters': 'L',
  'l': 'L',

  // Weight
  'pound': 'lb',
  'pounds': 'lb',
  'lb': 'lb',
  'lbs': 'lb',
  'gram': 'g',
  'grams': 'g',
  'g': 'g',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'kg': 'kg',

  // Count
  'piece': 'piece',
  'pieces': 'piece',
  'whole': 'whole',
  'slice': 'slice',
  'slices': 'slice',
  'clove': 'clove',
  'cloves': 'clove',
  'can': 'can',
  'cans': 'can',
  'package': 'package',
  'packages': 'package',
  'bunch': 'bunch',
  'bunches': 'bunch',
};

/**
 * Parse a fraction string to decimal
 */
function parseFraction(fraction: string): number {
  if (fraction.includes('/')) {
    const [numerator, denominator] = fraction.split('/').map(Number);
    return numerator / denominator;
  }
  return parseFloat(fraction);
}

/**
 * Parse amount from ingredient string (handles fractions and ranges)
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 1;

  // Handle ranges (e.g., "1-2 cups") - take the average
  if (amountStr.includes('-')) {
    const [min, max] = amountStr.split('-').map(s => parseFloat(s.trim()));
    return (min + max) / 2;
  }

  // Handle mixed numbers (e.g., "1 1/2")
  if (amountStr.includes(' ') && amountStr.includes('/')) {
    const parts = amountStr.split(' ');
    const whole = parseFloat(parts[0]);
    const fraction = parseFraction(parts[1]);
    return whole + fraction;
  }

  // Handle fractions (e.g., "1/2")
  if (amountStr.includes('/')) {
    return parseFraction(amountStr);
  }

  // Handle decimals or whole numbers
  return parseFloat(amountStr);
}

/**
 * Normalize unit to standard form
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  return UNIT_CONVERSIONS[normalized] || normalized;
}

/**
 * Parse a single ingredient string
 * Supports formats like:
 * - "2 cups flour"
 * - "1/2 teaspoon salt"
 * - "3-4 large eggs"
 * - "1 can (14 oz) tomatoes"
 */
export function parseIngredient(
  ingredientText: string,
  recipeId?: string,
  recipeName?: string
): ParsedIngredient {
  // Remove extra whitespace
  const text = ingredientText.trim();

  // Regular expression to match: [amount] [unit] [name]
  // Handles fractions, decimals, ranges, and optional units
  const regex = /^([\d\/\.\s\-]+)?\s*([a-zA-Z]+)?\s*(.+)$/;
  const match = text.match(regex);

  if (!match) {
    // If parsing fails, return as-is with amount 1
    return {
      name: text,
      amount: 1,
      unit: '',
      originalText: text,
      recipeId,
      recipeName,
    };
  }

  const [, amountStr, unitStr, nameStr] = match;

  const amount = amountStr ? parseAmount(amountStr.trim()) : 1;
  const unit = unitStr ? normalizeUnit(unitStr) : '';
  const name = nameStr.trim();

  return {
    name,
    amount,
    unit,
    originalText: text,
    recipeId,
    recipeName,
  };
}

/**
 * Parse ingredients from a recipe object
 */
export function parseRecipeIngredients(
  recipe: {
    id: string;
    name: string;
    ingredients: any;
  }
): ParsedIngredient[] {
  if (!recipe.ingredients) return [];

  // Handle different ingredient formats
  if (Array.isArray(recipe.ingredients)) {
    return recipe.ingredients.map((ing) => {
      // If ingredient is already an object with structure
      if (typeof ing === 'object' && ing.name) {
        return {
          name: ing.name,
          amount: ing.amount || 1,
          unit: ing.unit ? normalizeUnit(ing.unit) : '',
          originalText: ing.originalText || `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim(),
          recipeId: recipe.id,
          recipeName: recipe.name,
        };
      }
      // If ingredient is a string
      if (typeof ing === 'string') {
        return parseIngredient(ing, recipe.id, recipe.name);
      }
      return {
        name: String(ing),
        amount: 1,
        unit: '',
        originalText: String(ing),
        recipeId: recipe.id,
        recipeName: recipe.name,
      };
    });
  }

  return [];
}

/**
 * Aggregate ingredients from multiple recipes
 * Combines ingredients with the same name and unit
 */
export function aggregateIngredients(
  parsedIngredients: ParsedIngredient[]
): AggregatedIngredient[] {
  const aggregated: Record<string, AggregatedIngredient> = {};

  for (const ingredient of parsedIngredients) {
    // Create a key based on name and unit (normalize for comparison)
    const key = `${ingredient.name.toLowerCase()}|${ingredient.unit.toLowerCase()}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        name: ingredient.name,
        amount: 0,
        unit: ingredient.unit,
        recipes: [],
      };
    }

    // Add amount
    aggregated[key].amount += ingredient.amount;

    // Add recipe reference if not already present
    if (ingredient.recipeId && ingredient.recipeName) {
      const existingRecipe = aggregated[key].recipes.find(
        (r) => r.id === ingredient.recipeId
      );
      if (!existingRecipe) {
        aggregated[key].recipes.push({
          id: ingredient.recipeId,
          name: ingredient.recipeName,
        });
      }
    }
  }

  // Convert to array and sort by name
  return Object.values(aggregated).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Format ingredient for display
 */
export function formatIngredient(ingredient: AggregatedIngredient): string {
  const amount = ingredient.amount % 1 === 0
    ? ingredient.amount.toString()
    : ingredient.amount.toFixed(2);

  const unit = ingredient.unit ? ` ${ingredient.unit}` : '';
  const recipes = ingredient.recipes.length > 1
    ? ` (from ${ingredient.recipes.length} recipes)`
    : '';

  return `${amount}${unit} ${ingredient.name}${recipes}`;
}

/**
 * Generate shopping list from meal plans
 * @param recipes - Array of recipes with ingredients
 * @returns Aggregated shopping list items
 */
export function generateShoppingList(
  recipes: Array<{
    id: string;
    name: string;
    ingredients: any;
  }>
): AggregatedIngredient[] {
  // Parse all ingredients from all recipes
  const allParsedIngredients = recipes.flatMap((recipe) =>
    parseRecipeIngredients(recipe)
  );

  // Aggregate ingredients
  const aggregated = aggregateIngredients(allParsedIngredients);

  return aggregated;
}

/**
 * Categorize ingredients (basic categorization)
 */
export function categorizeIngredient(ingredientName: string): string {
  const name = ingredientName.toLowerCase();

  // Produce
  if (
    name.includes('tomato') ||
    name.includes('lettuce') ||
    name.includes('onion') ||
    name.includes('garlic') ||
    name.includes('pepper') ||
    name.includes('carrot') ||
    name.includes('celery') ||
    name.includes('potato') ||
    name.includes('apple') ||
    name.includes('banana') ||
    name.includes('lemon') ||
    name.includes('lime') ||
    name.includes('orange')
  ) {
    return 'Produce';
  }

  // Meat & Seafood
  if (
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('pork') ||
    name.includes('fish') ||
    name.includes('shrimp') ||
    name.includes('salmon') ||
    name.includes('turkey')
  ) {
    return 'Meat & Seafood';
  }

  // Dairy
  if (
    name.includes('milk') ||
    name.includes('cheese') ||
    name.includes('yogurt') ||
    name.includes('butter') ||
    name.includes('cream') ||
    name.includes('egg')
  ) {
    return 'Dairy & Eggs';
  }

  // Grains & Bread
  if (
    name.includes('flour') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('rice') ||
    name.includes('oat') ||
    name.includes('cereal')
  ) {
    return 'Grains & Bread';
  }

  // Canned & Packaged
  if (name.includes('can') || name.includes('canned')) {
    return 'Canned Goods';
  }

  // Spices & Seasonings
  if (
    name.includes('salt') ||
    name.includes('pepper') ||
    name.includes('spice') ||
    name.includes('herb') ||
    name.includes('oregano') ||
    name.includes('basil') ||
    name.includes('cumin')
  ) {
    return 'Spices & Seasonings';
  }

  // Default
  return 'Other';
}
