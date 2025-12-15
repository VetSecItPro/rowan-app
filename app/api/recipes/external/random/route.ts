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

// Query parameter validation schema
const QueryParamsSchema = z.object({
  count: z.coerce.number().int().min(1).max(50).default(12),
});

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
    const supabase = createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validatedParams = QueryParamsSchema.parse({
      count: searchParams.get('count') || '12',
    });
    const { count } = validatedParams;

    const recipes: any[] = [];

    // TheMealDB random endpoint returns 1 recipe at a time
    const promises = Array(count)
      .fill(null)
      .map(() =>
        fetch('https://www.themealdb.com/api/json/v1/1/random.php')
          .then((res) => res.json())
      );

    const results = await Promise.all(promises);

    for (const data of results) {
      if (data.meals && data.meals[0]) {
        const meal = data.meals[0];

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
          id: `themealdb-${meal.idMeal}`,
          source: 'themealdb',
          name: sanitizePlainText(meal.strMeal),
          description: sanitizePlainText(`${meal.strCategory} - ${meal.strArea} cuisine`),
          image_url: sanitizeUrl(meal.strMealThumb),
          cuisine: sanitizePlainText(meal.strArea),
          ingredients,
          instructions: sanitizePlainText(meal.strInstructions),
          source_url: sanitizeUrl(meal.strSource || meal.strYoutube),
        });
      }
    }

    const uniqueRecipes = Array.from(
      new Map(recipes.map((recipe) => [recipe.id, recipe])).values()
    );

    return NextResponse.json(uniqueRecipes);
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
