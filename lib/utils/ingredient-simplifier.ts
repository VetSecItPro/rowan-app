/**
 * Ingredient Simplifier Utility
 *
 * Converts detailed recipe ingredients into simplified shopping list items.
 * e.g., "1 pinch of salt" → "Salt"
 * e.g., "20ml fresh milk" → "Milk"
 * e.g., "2 cups all-purpose flour, sifted" → "All-purpose flour"
 */

// Common measurement units to strip
const UNITS = [
  // Volume
  'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
  'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons',
  'cup', 'cups', 'fl oz', 'fluid ounce', 'fluid ounces',
  'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons',
  // Weight
  'g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds',
  // Count/Size
  'pinch', 'pinches', 'dash', 'dashes', 'drop', 'drops',
  'slice', 'slices', 'piece', 'pieces', 'clove', 'cloves',
  'sprig', 'sprigs', 'bunch', 'bunches', 'head', 'heads',
  'stalk', 'stalks', 'can', 'cans', 'jar', 'jars',
  'package', 'packages', 'pkg', 'box', 'boxes',
  'stick', 'sticks', 'cube', 'cubes', 'sheet', 'sheets',
  'handful', 'handfuls', 'serving', 'servings',
];

// Descriptors/adjectives to strip (prep methods, sizes, states)
const DESCRIPTORS = [
  // Size
  'small', 'medium', 'large', 'extra-large', 'xl', 'jumbo',
  // Prep methods
  'chopped', 'diced', 'minced', 'sliced', 'crushed', 'grated',
  'shredded', 'julienned', 'cubed', 'halved', 'quartered',
  'mashed', 'pureed', 'blended', 'ground', 'crumbled',
  'beaten', 'whisked', 'melted', 'softened', 'room temperature',
  'chilled', 'frozen', 'thawed', 'drained', 'rinsed',
  'peeled', 'seeded', 'deveined', 'deboned', 'trimmed',
  'sifted', 'toasted', 'roasted', 'fried', 'boiled',
  // Freshness/quality
  'fresh', 'freshly', 'dried', 'dry', 'canned', 'frozen',
  'raw', 'cooked', 'uncooked', 'ripe', 'overripe', 'unripe',
  'organic', 'natural', 'pure', 'real', 'imitation',
  // Temperature
  'hot', 'warm', 'cold', 'cool', 'lukewarm',
  // Other
  'whole', 'half', 'optional', 'to taste', 'as needed',
  'divided', 'plus more', 'for garnish', 'for serving',
  'lightly', 'finely', 'roughly', 'thinly', 'thickly',
  'packed', 'loosely packed', 'firmly packed', 'heaping', 'level',
];

// Words to remove that connect quantities to ingredients
const CONNECTOR_WORDS = ['of', 'the', 'a', 'an', 'some', 'about', 'approximately', 'approx'];

// Pattern for fractions (1/2, ½, etc.) and numbers
const QUANTITY_PATTERN = /^[\d\s\-\/\.,½¼¾⅓⅔⅛⅜⅝⅞]+/;

// Pattern for parenthetical notes like "(about 2 cups)" or "(optional)"
const PARENTHETICAL_PATTERN = /\([^)]*\)/g;

// Pattern for trailing notes after comma
const TRAILING_NOTES_PATTERN = /,\s*(or.*|to taste|as needed|divided|for.*|plus.*|about.*)$/i;

export interface SimplifiedIngredient {
  original: string;
  simplified: string;
  selected: boolean;
}

/**
 * Simplifies a single ingredient string
 */
export function simplifyIngredient(ingredient: string): string {
  if (!ingredient || typeof ingredient !== 'string') {
    return ingredient || '';
  }

  let result = ingredient.trim();

  // Remove parenthetical notes
  result = result.replace(PARENTHETICAL_PATTERN, '');

  // Remove trailing notes after comma
  result = result.replace(TRAILING_NOTES_PATTERN, '');

  // Remove leading quantities (numbers, fractions)
  result = result.replace(QUANTITY_PATTERN, '').trim();

  // Build regex pattern for units (with word boundaries)
  const unitsPattern = new RegExp(
    `^(${UNITS.join('|')})\\s+`,
    'i'
  );

  // Remove leading units
  result = result.replace(unitsPattern, '');

  // Remove connector words at the start
  const connectorPattern = new RegExp(
    `^(${CONNECTOR_WORDS.join('|')})\\s+`,
    'i'
  );
  result = result.replace(connectorPattern, '');

  // Remove descriptors (as whole words)
  DESCRIPTORS.forEach(descriptor => {
    const pattern = new RegExp(`\\b${descriptor}\\b`, 'gi');
    result = result.replace(pattern, '');
  });

  // Clean up extra spaces and punctuation
  result = result
    .replace(/\s+/g, ' ')           // Multiple spaces to single
    .replace(/^[\s,.-]+/, '')        // Leading punctuation/spaces
    .replace(/[\s,.-]+$/, '')        // Trailing punctuation/spaces
    .replace(/\s*,\s*/g, ' ')        // Commas to spaces
    .trim();

  // Capitalize first letter of each word (title case)
  result = result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // If we've stripped everything, return original with basic cleanup
  if (!result || result.length < 2) {
    return ingredient
      .replace(QUANTITY_PATTERN, '')
      .replace(PARENTHETICAL_PATTERN, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return result;
}

/**
 * Processes an array of ingredients and returns simplified versions
 * with selection state for the preview modal
 */
export function simplifyIngredients(ingredients: (string | { name?: string; amount?: string | number; unit?: string })[]): SimplifiedIngredient[] {
  const seen = new Set<string>();
  const results: SimplifiedIngredient[] = [];

  for (const ingredient of ingredients) {
    // Handle both string and object formats
    let originalText: string;
    if (typeof ingredient === 'string') {
      originalText = ingredient;
    } else if (ingredient && typeof ingredient === 'object') {
      // Reconstruct from object format
      const parts = [ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean);
      originalText = parts.join(' ');
    } else {
      continue;
    }

    if (!originalText || originalText.trim().length === 0) {
      continue;
    }

    const simplified = simplifyIngredient(originalText);

    // Deduplicate by simplified name (case-insensitive)
    const key = simplified.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        original: originalText,
        simplified,
        selected: true, // Selected by default
      });
    }
  }

  return results;
}

/**
 * Quick test function for development
 */
