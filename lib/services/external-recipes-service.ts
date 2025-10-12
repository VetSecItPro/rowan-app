/**
 * External Recipe APIs Service
 * Aggregates recipes from multiple free APIs
 */

export interface ExternalRecipe {
  id: string;
  source: 'themealdb' | 'edamam' | 'spoonacular' | 'tasty' | 'apininjas';
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
 * Search Spoonacular API via Next.js API proxy
 * Free tier: 150 requests/day
 */
async function searchSpoonacular(query: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/spoonacular/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Spoonacular API error:', error);
    return [];
  }
}

/**
 * Search Tasty API via Next.js API proxy (RapidAPI)
 */
async function searchTasty(query: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/tasty/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Tasty API error:', error);
    return [];
  }
}

/**
 * Search API Ninjas Recipe API via Next.js API proxy
 */
async function searchApiNinjas(query: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/apininjas/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Ninjas error:', error);
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
  const [
    themealdbResults,
    spoonacularResults,
    edamamResults,
    tastyResults,
    apininjasResults,
  ] = await Promise.all([
    searchTheMealDB(trimmedQuery),
    searchSpoonacular(trimmedQuery),
    searchEdamam(trimmedQuery),
    searchTasty(trimmedQuery),
    searchApiNinjas(trimmedQuery),
  ]);

  // Combine all results
  const allResults = [
    ...themealdbResults,
    ...spoonacularResults,
    ...edamamResults,
    ...tastyResults,
    ...apininjasResults,
  ];

  // Sort by source priority (TheMealDB, Spoonacular, Edamam, Tasty, API Ninjas)
  const sourcePriority: Record<string, number> = {
    themealdb: 1,
    spoonacular: 2,
    edamam: 3,
    tasty: 4,
    apininjas: 5,
  };

  return allResults.sort((a, b) => {
    return sourcePriority[a.source] - sourcePriority[b.source];
  });
}

/**
 * Search TheMealDB by cuisine
 */
async function searchTheMealDBByCuisine(cuisine: string): Promise<ExternalRecipe[]> {
  try {
    const response = await fetch(
      `/api/recipes/external/cuisine?cuisine=${encodeURIComponent(cuisine)}`
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('TheMealDB cuisine search error:', error);
    return [];
  }
}

/**
 * Search recipes by cuisine type across all APIs
 * Note: Some APIs use cuisine as a search term since they don't have dedicated cuisine filters
 */
export async function searchByCuisine(cuisine: string): Promise<ExternalRecipe[]> {
  try {
    // Search all APIs in parallel
    // For APIs without cuisine filters, we use the cuisine name as a search query
    const [
      themealdbResults,
      spoonacularResults,
      edamamResults,
      tastyResults,
      apininjasResults,
    ] = await Promise.all([
      searchTheMealDBByCuisine(cuisine),
      searchSpoonacular(cuisine), // Uses cuisine name as search query
      searchEdamam(cuisine), // Uses cuisine name as search query
      searchTasty(cuisine), // Uses cuisine name as search query
      searchApiNinjas(cuisine), // Uses cuisine name as search query
    ]);

    // Combine all results
    const allResults = [
      ...themealdbResults,
      ...spoonacularResults,
      ...edamamResults,
      ...tastyResults,
      ...apininjasResults,
    ];

    // More lenient filtering - if we got results from the search, assume they're relevant
    // Don't over-filter since the search query itself targets the cuisine
    const filteredResults = allResults;

    // Sort by source priority
    const sourcePriority: Record<string, number> = {
      themealdb: 1,
      spoonacular: 2,
      edamam: 3,
      tasty: 4,
      apininjas: 5,
    };

    return filteredResults.sort((a, b) => {
      return sourcePriority[a.source] - sourcePriority[b.source];
    });
  } catch (error) {
    console.error('Cuisine search error:', error);
    return [];
  }
}

/**
 * List of supported cuisines (aggregated from all APIs)
 * Includes cuisines from TheMealDB, Spoonacular, Edamam, Tasty, and API Ninjas
 */
export const SUPPORTED_CUISINES = [
  { value: 'African', label: 'African', flag: '🌍' },
  { value: 'American', label: 'American', flag: '🇺🇸' },
  { value: 'British', label: 'British', flag: '🇬🇧' },
  { value: 'Cajun', label: 'Cajun', flag: '🦞' },
  { value: 'Canadian', label: 'Canadian', flag: '🇨🇦' },
  { value: 'Caribbean', label: 'Caribbean', flag: '🏝️' },
  { value: 'Chinese', label: 'Chinese', flag: '🇨🇳' },
  { value: 'Croatian', label: 'Croatian', flag: '🇭🇷' },
  { value: 'Dutch', label: 'Dutch', flag: '🇳🇱' },
  { value: 'Egyptian', label: 'Egyptian', flag: '🇪🇬' },
  { value: 'Filipino', label: 'Filipino', flag: '🇵🇭' },
  { value: 'French', label: 'French', flag: '🇫🇷' },
  { value: 'German', label: 'German', flag: '🇩🇪' },
  { value: 'Greek', label: 'Greek', flag: '🇬🇷' },
  { value: 'Indian', label: 'Indian', flag: '🇮🇳' },
  { value: 'Irish', label: 'Irish', flag: '🇮🇪' },
  { value: 'Italian', label: 'Italian', flag: '🇮🇹' },
  { value: 'Jamaican', label: 'Jamaican', flag: '🇯🇲' },
  { value: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
  { value: 'Kenyan', label: 'Kenyan', flag: '🇰🇪' },
  { value: 'Korean', label: 'Korean', flag: '🇰🇷' },
  { value: 'Latin American', label: 'Latin American', flag: '🌎' },
  { value: 'Malaysian', label: 'Malaysian', flag: '🇲🇾' },
  { value: 'Mediterranean', label: 'Mediterranean', flag: '🫒' },
  { value: 'Mexican', label: 'Mexican', flag: '🇲🇽' },
  { value: 'Middle Eastern', label: 'Middle Eastern', flag: '🕌' },
  { value: 'Moroccan', label: 'Moroccan', flag: '🇲🇦' },
  { value: 'Nordic', label: 'Nordic', flag: '❄️' },
  { value: 'Polish', label: 'Polish', flag: '🇵🇱' },
  { value: 'Portuguese', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'Russian', label: 'Russian', flag: '🇷🇺' },
  { value: 'South American', label: 'South American', flag: '🌎' },
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
