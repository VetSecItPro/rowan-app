/**
 * API Route: Get Random Recipes
 * Proxies TheMealDB API to avoid CSP issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';
import { withPublicDataCache } from '@/lib/utils/cache-headers';

// Query parameter validation schema
const QueryParamsSchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(12),
});

type MealDetail = {
  idMeal?: string;
  strMeal?: string;
  strCategory?: string;
  strArea?: string;
  strMealThumb?: string;
  strInstructions?: string;
  strSource?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
};

type MealDbRandomResponse = {
  meals?: MealDetail[] | null;
};

type ExternalRecipe = {
  id: string;
  source: string;
  name: string;
  description: string;
  image_url: string;
  cuisine: string;
  ingredients: Array<{ name: string; amount?: string; unit?: string }>;
  instructions: string;
  source_url: string;
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting with automatic fallback
    const ip = extractIP(request.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify subscription tier for meal planning
    const tierCheck = await canAccessFeature(user.id, 'canUseMealPlanning', supabase);
    if (!tierCheck.allowed) {
      return buildUpgradeResponse('canUseMealPlanning', tierCheck.tier ?? 'free');
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validatedParams = QueryParamsSchema.parse({
      count: searchParams.get('count') || '12',
    });
    const { count } = validatedParams;

    const recipes: ExternalRecipe[] = [];

    // TheMealDB random endpoint returns 1 recipe at a time
    const promises = Array(count)
      .fill(null)
      .map(() =>
        fetch('https://www.themealdb.com/api/json/v1/1/random.php')
          .then(async (res) => (await res.json()) as MealDbRandomResponse)
      );

    const results: MealDbRandomResponse[] = await Promise.all(promises);

    for (const data of results) {
      if (data.meals && data.meals[0]) {
        const meal = data.meals[0];
        const mealId = meal.idMeal ?? crypto.randomUUID();
        const mealName = meal.strMeal ?? '';
        const mealCategory = meal.strCategory ?? '';
        const mealArea = meal.strArea ?? '';
        const mealThumb = meal.strMealThumb ?? '';
        const mealInstructions = meal.strInstructions ?? '';
        const mealSource = meal.strSource ?? '';
        const mealYoutube = meal.strYoutube ?? '';

        // Parse and sanitize ingredients (external data could contain XSS payloads)
        const ingredients: Array<{ name: string; amount?: string; unit?: string }> = [];
        for (let i = 1; i <= 20; i++) {
          const ingredient = meal[`strIngredient${i}`];
          const measure = meal[`strMeasure${i}`];

          if (ingredient && ingredient.trim()) {
            ingredients.push({
              name: sanitizePlainText(ingredient.trim()),
              amount: sanitizePlainText(measure?.trim()) || undefined,
            });
          }
        }

        recipes.push({
          id: `themealdb-${mealId}`,
          source: 'themealdb',
          name: sanitizePlainText(mealName),
          description: sanitizePlainText(`${mealCategory} - ${mealArea} cuisine`),
          image_url: sanitizeUrl(mealThumb),
          cuisine: sanitizePlainText(mealArea),
          ingredients,
          instructions: sanitizePlainText(mealInstructions),
          source_url: sanitizeUrl(mealSource || mealYoutube),
        });
      }
    }

    const uniqueRecipes = Array.from(
      new Map(recipes.map((recipe) => [recipe.id, recipe])).values()
    );

    return withPublicDataCache(NextResponse.json(uniqueRecipes));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Random recipes API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to fetch random recipes' },
      { status: 500 }
    );
  }
}
