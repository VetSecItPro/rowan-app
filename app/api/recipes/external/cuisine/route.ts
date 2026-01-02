/**
 * API Route: Search Recipes by Cuisine
 * Proxies TheMealDB API to avoid CSP issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';

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

    const searchParams = request.nextUrl.searchParams;
    const cuisine = searchParams.get('cuisine');

    if (!cuisine) {
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(cuisine)}`
    );

    if (!response.ok) {
      return NextResponse.json([]);
    }

    const data = await response.json();

    if (!data.meals) {
      return NextResponse.json([]);
    }

    // Need to fetch full details for each meal (limit to 12)
    const detailPromises = data.meals.slice(0, 12).map(async (meal: any) => {
      const detailResponse = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
      );
      const detailData = await detailResponse.json();
      return detailData.meals?.[0];
    });

    const meals = await Promise.all(detailPromises);

    const recipes = meals.filter(Boolean).map((meal: any) => {
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

      return {
        id: `themealdb-${meal.idMeal}`,
        source: 'themealdb',
        name: sanitizePlainText(meal.strMeal),
        description: sanitizePlainText(`${meal.strCategory} - ${meal.strArea} cuisine`),
        image_url: sanitizeUrl(meal.strMealThumb),
        cuisine: sanitizePlainText(meal.strArea),
        ingredients,
        instructions: sanitizePlainText(meal.strInstructions),
        source_url: sanitizeUrl(meal.strSource || meal.strYoutube),
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    logger.error('Cuisine search API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to search by cuisine' },
      { status: 500 }
    );
  }
}
