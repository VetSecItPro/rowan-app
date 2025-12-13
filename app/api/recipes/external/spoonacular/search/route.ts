/**
 * API Route: Search Spoonacular Recipes
 * Proxies Spoonacular API to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';

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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const apiKey = process.env.SPOONACULAR_API_KEY;

    console.log('[Spoonacular] API called with query:', query);
    console.log('[Spoonacular] API key configured:', !!apiKey);

    if (!query || query.trim().length < 2) {
      console.log('[Spoonacular] Query too short, returning empty');
      return NextResponse.json([]);
    }

    if (!apiKey) {
      console.error('[Spoonacular] API key not configured - check SPOONACULAR_API_KEY environment variable');
      return NextResponse.json([]);
    }

    // Search for recipes - build URL without API key for safe logging
    const baseUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=10&addRecipeInformation=true&fillIngredients=true`;
    console.log('[Spoonacular] Calling API:', baseUrl);

    // Add API key only when making the request (never in logged URL)
    const searchResponse = await fetch(`${baseUrl}&apiKey=${apiKey}`);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[Spoonacular] API failed:', searchResponse.status, searchResponse.statusText, errorText);
      return NextResponse.json([]);
    }

    const searchData = await searchResponse.json();
    console.log('[Spoonacular] Got', searchData.results?.length || 0, 'recipes');

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json([]);
    }

    const recipes = searchData.results.map((recipe: any) => {
      // Parse ingredients
      const ingredients = recipe.extendedIngredients?.map((ing: any) => ({
        name: ing.name || ing.original,
        amount: ing.amount ? ing.amount.toString() : undefined,
        unit: ing.unit || undefined,
      })) || [];

      // Parse instructions
      let instructions = '';
      if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
        instructions = recipe.analyzedInstructions[0].steps
          .map((step: any) => `${step.number}. ${step.step}`)
          .join('\n\n');
      }

      return {
        id: `spoonacular-${recipe.id}`,
        source: 'spoonacular',
        name: recipe.title,
        description: recipe.summary?.replace(/<[^>]*>/g, ''), // Strip HTML tags
        image_url: recipe.image,
        prep_time: recipe.preparationMinutes,
        cook_time: recipe.cookingMinutes,
        servings: recipe.servings,
        cuisine: recipe.cuisines?.[0],
        ingredients,
        instructions,
        source_url: recipe.sourceUrl || recipe.spoonacularSourceUrl,
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Spoonacular search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
