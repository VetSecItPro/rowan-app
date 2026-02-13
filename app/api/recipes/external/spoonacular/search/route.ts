/**
 * API Route: Search Spoonacular Recipes
 * Proxies Spoonacular API to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize';
import { canAccessFeature } from '@/lib/services/feature-access-service';
import { buildUpgradeResponse } from '@/lib/middleware/subscription-check';

export const dynamic = 'force-dynamic';

type SpoonacularIngredient = {
  name?: string;
  original?: string;
  amount?: number;
  unit?: string;
};

type SpoonacularStep = {
  number?: number;
  step?: string;
};

type SpoonacularInstruction = {
  steps?: SpoonacularStep[];
};

type SpoonacularRecipe = {
  id: number | string;
  extendedIngredients?: SpoonacularIngredient[];
  analyzedInstructions?: SpoonacularInstruction[];
  title?: string;
  summary?: string;
  image?: string;
  preparationMinutes?: number;
  cookingMinutes?: number;
  servings?: number;
  cuisines?: string[];
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
};

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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const apiKey = process.env.SPOONACULAR_API_KEY;

    logger.info('[Spoonacular] API called with query:', { component: 'api-route', data: query });
    logger.info('[Spoonacular] API key configured:', { component: 'api-route', data: !!apiKey });

    if (!query || query.trim().length < 2) {
      logger.info('[Spoonacular] Query too short, returning empty', { component: 'api-route' });
      return NextResponse.json([]);
    }

    if (!apiKey) {
      logger.error('[Spoonacular] API key not configured - check SPOONACULAR_API_KEY environment variable', undefined, { component: 'api-route', action: 'api_request' });
      return NextResponse.json([]);
    }

    // Search for recipes - build URL without API key for safe logging
    const baseUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=10&addRecipeInformation=true&fillIngredients=true`;
    logger.info('[Spoonacular] Calling API:', { component: 'api-route', data: baseUrl });

    // Add API key only when making the request (never in logged URL)
    const searchResponse = await fetch(`${baseUrl}&apiKey=${apiKey}`);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      logger.error('[Spoonacular] API failed:', undefined, { component: 'api-route', action: 'api_request', details: { status: searchResponse.status, statusText: searchResponse.statusText, errorText } });
      return NextResponse.json([]);
    }

    const searchData = await searchResponse.json();
    logger.info('[Spoonacular] Got recipes', { component: 'api-route', data: searchData.results?.length || 0 });

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json([]);
    }

    const results = (searchData.results ?? []) as SpoonacularRecipe[];
    const recipes = results.map((recipe) => {
      // Parse and sanitize ingredients (external data could contain XSS payloads)
      const ingredients = recipe.extendedIngredients?.map((ing) => ({
        name: sanitizePlainText(ing.name || ing.original),
        amount: ing.amount ? ing.amount.toString() : undefined,
        unit: sanitizePlainText(ing.unit) || undefined,
      })) || [];

      // Parse and sanitize instructions
      let instructions = '';
      if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
        instructions = (recipe.analyzedInstructions[0].steps ?? [])
          .map((step) => `${step.number}. ${sanitizePlainText(step.step)}`)
          .join('\n\n');
      }

      return {
        id: `spoonacular-${recipe.id}`,
        source: 'spoonacular',
        name: sanitizePlainText(recipe.title),
        description: sanitizePlainText(recipe.summary), // Properly sanitize with DOMPurify
        image_url: sanitizeUrl(recipe.image),
        prep_time: recipe.preparationMinutes,
        cook_time: recipe.cookingMinutes,
        servings: recipe.servings,
        cuisine: sanitizePlainText(recipe.cuisines?.[0]),
        ingredients,
        instructions,
        source_url: sanitizeUrl(recipe.sourceUrl || recipe.spoonacularSourceUrl),
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    logger.error('Spoonacular search API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
