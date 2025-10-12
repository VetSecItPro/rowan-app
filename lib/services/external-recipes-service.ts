/**
 * External Recipe APIs Service
 * Aggregates recipes from multiple free APIs
 */

export interface ExternalRecipe {
  id: string;
  source: 'themealdb' | 'edamam' | 'recipepuppy';
  name: string;
  description?: string;
  image_url?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  ingredients: Array<{
    name: string;
    amount?: string;
    unit?: string;
  }>;
  instructions?: string;
  source_url?: string;
}

/**
 * Search TheMealDB API via Next.js API proxy (avoids CSP issues)
 */
async function searchTheMealDB(query: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('TheMealDB API error:', error);
    return [];
  }
}

/**
 * Search Recipe Puppy API (completely free, no key required)
 * Note: Recipe Puppy API is often unreliable and may not work
 */
async function searchRecipePuppy(query: string): Promise<ExternalRecipe[]> {
  try {
    // Recipe Puppy API is deprecated and unreliable - skip for now
    // Using HTTPS causes CORS issues, using HTTP causes mixed content blocking
    console.log('Recipe Puppy API skipped - API is deprecated');
    return [];

    /* Commented out due to API issues
    const response = await fetch(
      `https://www.recipepuppy.com/api/?q=${encodeURIComponent(query)}`,
      {
        // Add timeout
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.results) return [];

    return data.results.map((recipe: any) => {
      const ingredients = recipe.ingredients
        .split(',')
        .map((ing: string) => ({
          name: ing.trim(),
        }))
        .filter((ing: any) => ing.name);

      return {
        id: `recipepuppy-${recipe.href}`,
        source: 'recipepuppy' as const,
        name: recipe.title,
        image_url: recipe.thumbnail || undefined,
        ingredients,
        source_url: recipe.href,
      };
    });
    */
  } catch (error) {
    console.error('Recipe Puppy API error:', error);
    return [];
  }
}

/**
 * Search Edamam API (free tier: 10 requests/min, requires API key)
 * Note: This requires NEXT_PUBLIC_EDAMAM_APP_ID and NEXT_PUBLIC_EDAMAM_APP_KEY
 */
async function searchEdamam(query: string): Promise<ExternalRecipe[]> {
  const appId = process.env.NEXT_PUBLIC_EDAMAM_APP_ID;
  const appKey = process.env.NEXT_PUBLIC_EDAMAM_APP_KEY;

  // Skip if no API credentials
  if (!appId || !appKey) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(query)}&app_id=${appId}&app_key=${appKey}`
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!data.hits) return [];

    return data.hits.map((hit: any) => {
      const recipe = hit.recipe;

      const ingredients = recipe.ingredients.map((ing: any) => ({
        name: ing.food,
        amount: ing.quantity ? Math.round(ing.quantity).toString() : undefined,
        unit: ing.measure,
      }));

      return {
        id: `edamam-${recipe.uri.split('#')[1]}`,
        source: 'edamam' as const,
        name: recipe.label,
        image_url: recipe.image,
        prep_time: recipe.totalTime ? Math.round(recipe.totalTime) : undefined,
        servings: recipe.yield,
        cuisine: recipe.cuisineType?.[0],
        ingredients,
        source_url: recipe.url,
        description: recipe.dishType?.join(', '),
      };
    });
  } catch (error) {
    console.error('Edamam API error:', error);
    return [];
  }
}

/**
 * Search all available recipe APIs and aggregate results
 */
export async function searchExternalRecipes(query: string): Promise<ExternalRecipe[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const trimmedQuery = query.trim();

  // Search all APIs in parallel
  const [themealdbResults, recipepuppyResults, edamamResults] = await Promise.all([
    searchTheMealDB(trimmedQuery),
    searchRecipePuppy(trimmedQuery),
    searchEdamam(trimmedQuery),
  ]);

  // Combine and deduplicate results
  const allResults = [
    ...themealdbResults,
    ...recipepuppyResults,
    ...edamamResults,
  ];

  // Sort by source priority (TheMealDB first, then Edamam, then Recipe Puppy)
  const sourcePriority: Record<string, number> = {
    themealdb: 1,
    edamam: 2,
    recipepuppy: 3,
  };

  return allResults.sort((a, b) => {
    return sourcePriority[a.source] - sourcePriority[b.source];
  });
}

/**
 * Search recipes by cuisine type via Next.js API proxy
 */
export async function searchByCuisine(cuisine: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/cuisine?cuisine=${encodeURIComponent(cuisine)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Cuisine search error:', error);
    return [];
  }
}

/**
 * List of supported cuisines
 */
export const SUPPORTED_CUISINES = [
  { value: 'American', label: 'American', flag: '🇺🇸' },
  { value: 'British', label: 'British', flag: '🇬🇧' },
  { value: 'Canadian', label: 'Canadian', flag: '🇨🇦' },
  { value: 'Chinese', label: 'Chinese', flag: '🇨🇳' },
  { value: 'Croatian', label: 'Croatian', flag: '🇭🇷' },
  { value: 'Dutch', label: 'Dutch', flag: '🇳🇱' },
  { value: 'Egyptian', label: 'Egyptian', flag: '🇪🇬' },
  { value: 'Filipino', label: 'Filipino', flag: '🇵🇭' },
  { value: 'French', label: 'French', flag: '🇫🇷' },
  { value: 'Greek', label: 'Greek', flag: '🇬🇷' },
  { value: 'Indian', label: 'Indian', flag: '🇮🇳' },
  { value: 'Irish', label: 'Irish', flag: '🇮🇪' },
  { value: 'Italian', label: 'Italian', flag: '🇮🇹' },
  { value: 'Jamaican', label: 'Jamaican', flag: '🇯🇲' },
  { value: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
  { value: 'Kenyan', label: 'Kenyan', flag: '🇰🇪' },
  { value: 'Malaysian', label: 'Malaysian', flag: '🇲🇾' },
  { value: 'Mexican', label: 'Mexican', flag: '🇲🇽' },
  { value: 'Moroccan', label: 'Moroccan', flag: '🇲🇦' },
  { value: 'Polish', label: 'Polish', flag: '🇵🇱' },
  { value: 'Portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'Russian', label: 'Russian', flag: '🇷🇺' },
  { value: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
  { value: 'Thai', label: 'Thai', flag: '🇹🇭' },
  { value: 'Tunisian', label: 'Tunisian', flag: '🇹🇳' },
  { value: 'Turkish', label: 'Turkish', flag: '🇹🇷' },
  { value: 'Vietnamese', label: 'Vietnamese', flag: '🇻🇳' },
];

/**
 * Get random recipes for inspiration via Next.js API proxy
 */
export async function getRandomRecipes(count: number = 10): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(`/api/recipes/external/random?count=${count}`);

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Random recipes error:', error);
    return [];
  }
}
