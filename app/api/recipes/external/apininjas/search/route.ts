/**
 * API Route: Search API Ninjas Recipes
 * Proxies API Ninjas to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { sanitizePlainText } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

type ApiNinjasRecipe = {
  title?: string;
  ingredients?: string;
  servings?: string | number;
  instructions?: string;
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const apiKey = process.env.API_NINJAS_KEY;

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    if (!apiKey) {
      logger.error('API Ninjas key not configured', undefined, { component: 'api-route', action: 'api_request' });
      return NextResponse.json([]);
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/recipe?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      logger.error('API Ninjas search failed:', undefined, { component: 'api-route', action: 'api_request', details: response.statusText });
      return NextResponse.json([]);
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json([]);
    }

    const recipes = (data as ApiNinjasRecipe[]).map((recipe) => {
      const title = typeof recipe.title === 'string' ? recipe.title : '';
      const instructions = typeof recipe.instructions === 'string' ? recipe.instructions : '';
      // Parse and sanitize ingredients from pipe-separated string (external data could contain XSS payloads)
      const ingredients = recipe.ingredients
        ?.split('|')
        .map((ing: string) => ({
          name: sanitizePlainText(ing.trim()),
        })) || [];

      return {
        id: `apininjas-${sanitizePlainText(title)}-${crypto.randomUUID()}`,
        source: 'apininjas',
        name: sanitizePlainText(title),
        servings: recipe.servings ? Number.parseInt(String(recipe.servings), 10) : undefined,
        ingredients,
        instructions: sanitizePlainText(instructions),
      };
    });

    return NextResponse.json(recipes);
  } catch (error) {
    logger.error('API Ninjas search API error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    );
  }
}
